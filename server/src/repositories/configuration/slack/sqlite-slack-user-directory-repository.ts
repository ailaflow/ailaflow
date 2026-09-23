import { SqliteDatabase } from '../../../core/sqlite-database';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { SlackDirectoryCounts, SlackUserDirectoryRepository } from './slack-user-directory-repository';
import { SlackDirectoryUser } from './slack-types';

interface SlackDirectoryUserRow extends Omit<SlackDirectoryUser, 'isDeleted' | 'isBot' | 'isAppUser'> {
  isDeleted: number;
  isBot: number;
  isAppUser: number;
}

export class SqliteSlackUserDirectoryRepository implements SlackUserDirectoryRepository {
  private readonly db: SqliteDatabase;

  public constructor(databases: SqliteDatabases) {
    this.db = databases.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'slack_users', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE slack_users (
            workspaceId TEXT NOT NULL,
            slackUserId TEXT NOT NULL,
            legacyName TEXT,
            displayName TEXT,
            realName TEXT,
            email TEXT,
            isDeleted INTEGER NOT NULL,
            isBot INTEGER NOT NULL,
            isAppUser INTEGER NOT NULL,
            lastSeenAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            PRIMARY KEY (workspaceId, slackUserId)
          ) STRICT
        `);
      }
    });
  }

  public async replaceFromRefresh(_: AbortSignal, workspaceId: string, users: SlackDirectoryUser[], refreshedAt: number): Promise<void> {
    await this.db.write(db => {
      const upsert = db.prepare(`
        INSERT INTO slack_users (
          workspaceId, slackUserId, legacyName, displayName, realName, email,
          isDeleted, isBot, isAppUser, lastSeenAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspaceId, slackUserId) DO UPDATE SET
          legacyName = excluded.legacyName,
          displayName = excluded.displayName,
          realName = excluded.realName,
          email = excluded.email,
          isDeleted = excluded.isDeleted,
          isBot = excluded.isBot,
          isAppUser = excluded.isAppUser,
          lastSeenAt = excluded.lastSeenAt,
          updatedAt = excluded.updatedAt
      `);
      for (const user of users) {
        upsert.run(
          workspaceId,
          user.slackUserId,
          user.legacyName,
          user.displayName,
          user.realName,
          user.email,
          user.isDeleted ? 1 : 0,
          user.isBot ? 1 : 0,
          user.isAppUser ? 1 : 0,
          refreshedAt,
          refreshedAt
        );
      }
      db.prepare(
        `
        UPDATE slack_users
        SET isDeleted = 1, updatedAt = ?
        WHERE workspaceId = ? AND lastSeenAt < ? AND isBot = 0 AND isAppUser = 0
      `
      ).run(refreshedAt, workspaceId, refreshedAt);
    });
  }

  public async tryGet(_: AbortSignal, workspaceId: string, slackUserId: string): Promise<SlackDirectoryUser | null> {
    return this.db.read(db => {
      const row = db.prepare(`SELECT * FROM slack_users WHERE workspaceId = ? AND slackUserId = ?`).get(workspaceId, slackUserId) as
        | SlackDirectoryUserRow
        | undefined;
      return row ? mapUser(row) : null;
    });
  }

  public async getCounts(_: AbortSignal, workspaceId: string): Promise<SlackDirectoryCounts> {
    return this.db.read(db => {
      const row = db
        .prepare(
          `
          SELECT
            SUM(CASE WHEN isDeleted = 0 AND isBot = 0 AND isAppUser = 0 THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN isDeleted = 1 AND isBot = 0 AND isAppUser = 0 THEN 1 ELSE 0 END) AS unavailable,
            MAX(lastSeenAt) AS lastRefreshedAt
          FROM slack_users WHERE workspaceId = ?
        `
        )
        .get(workspaceId) as { active: number | null; unavailable: number | null; lastRefreshedAt: number | null };
      return { active: row.active ?? 0, unavailable: row.unavailable ?? 0, lastRefreshedAt: row.lastRefreshedAt };
    });
  }
}

function mapUser(row: SlackDirectoryUserRow): SlackDirectoryUser {
  return { ...row, isDeleted: row.isDeleted === 1, isBot: row.isBot === 1, isAppUser: row.isAppUser === 1 };
}

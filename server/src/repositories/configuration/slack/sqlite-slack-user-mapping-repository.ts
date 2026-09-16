import { SqliteDatabase, SqliteDatabases } from '../../../core/sqlite-databases';
import { Transaction } from '../../../core/transaction';
import {
  SlackMappingChangeRecord,
  SlackMappingCounts,
  SlackMappingRevisionConflictError,
  SlackMappingValidationError,
  SlackUserMappingRepository
} from './slack-user-mapping-repository';
import { SlackMappingWelcomeStatus, SlackUserMapping } from './slack-types';

export class SqliteSlackUserMappingRepository implements SlackUserMappingRepository {
  private readonly db: SqliteDatabase;

  public constructor(databases: SqliteDatabases) {
    this.db = databases.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.write(db => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS slack_user_mappings (
          workspaceId TEXT NOT NULL,
          slackUserId TEXT NOT NULL,
          userName TEXT NOT NULL,
          channelName TEXT NOT NULL CHECK (channelName = 'default'),
          generation INTEGER NOT NULL,
          deliveryStartMessageId INTEGER,
          dmChannelId TEXT,
          welcomeStatus INTEGER NOT NULL,
          welcomeAttemptCount INTEGER NOT NULL,
          welcomeNextAttemptAt INTEGER,
          welcomeSentAt INTEGER,
          welcomeLastError TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          PRIMARY KEY (workspaceId, slackUserId),
          UNIQUE (userName, channelName),
          FOREIGN KEY (workspaceId, slackUserId) REFERENCES slack_users(workspaceId, slackUserId),
          FOREIGN KEY (userName) REFERENCES users(name) ON DELETE CASCADE
        ) STRICT
      `);
    });
  }

  public async getAll(_: AbortSignal, workspaceId?: string): Promise<SlackUserMapping[]> {
    return this.db.read(db => {
      const rows = workspaceId
        ? db.prepare(`SELECT * FROM slack_user_mappings WHERE workspaceId = ? ORDER BY slackUserId`).all(workspaceId)
        : db.prepare(`SELECT * FROM slack_user_mappings ORDER BY workspaceId, slackUserId`).all();
      return (rows as unknown as SlackUserMapping[]).map(mapMapping);
    });
  }

  public async tryGetBySlackUser(_: AbortSignal, workspaceId: string, slackUserId: string): Promise<SlackUserMapping | null> {
    return this.db.read(db => {
      const row = db
        .prepare(`SELECT * FROM slack_user_mappings WHERE workspaceId = ? AND slackUserId = ?`)
        .get(workspaceId, slackUserId) as SlackUserMapping | undefined;
      return row ? mapMapping(row) : null;
    });
  }

  public async tryGetByAilaUser(_: AbortSignal, userName: string, channelName: string): Promise<SlackUserMapping | null> {
    return this.db.read(db => {
      const row = db.prepare(`SELECT * FROM slack_user_mappings WHERE userName = ? AND channelName = ?`).get(userName, channelName) as
        | SlackUserMapping
        | undefined;
      return row ? mapMapping(row) : null;
    });
  }

  public async applyChanges(
    _: AbortSignal,
    workspaceId: string,
    expectedRevision: number,
    changes: SlackMappingChangeRecord[]
  ): Promise<number> {
    return this.db.write(db => {
      const configuration = db.prepare(`SELECT mappingRevision FROM slack_configuration WHERE id = 1`).get() as
        | { mappingRevision: number }
        | undefined;
      if (!configuration || configuration.mappingRevision !== expectedRevision) {
        throw new SlackMappingRevisionConflictError();
      }
      for (const change of changes) {
        const slackUser = db
          .prepare(`SELECT isDeleted, isBot, isAppUser FROM slack_users WHERE workspaceId = ? AND slackUserId = ?`)
          .get(workspaceId, change.slackUserId) as { isDeleted: number; isBot: number; isAppUser: number } | undefined;
        if (!slackUser || slackUser.isBot === 1 || slackUser.isAppUser === 1 || (change.userName !== null && slackUser.isDeleted === 1)) {
          throw new SlackMappingValidationError('Slack member is not available for mapping');
        }
        if (change.userName !== null) {
          const user = db.prepare(`SELECT 1 FROM users WHERE name = ?`).get(change.userName);
          if (!user) {
            throw new SlackMappingValidationError('AilaFlow user not found');
          }
        }
      }

      const now = Date.now();
      const originalMappings = db.prepare(`SELECT * FROM slack_user_mappings`).all() as unknown as SlackUserMapping[];
      for (const change of changes) {
        if (change.userName === null) {
          continue;
        }
        const existing = originalMappings.find(mapping => mapping.userName === change.userName && mapping.channelName === 'default');
        if (existing && (existing.workspaceId !== workspaceId || existing.slackUserId !== change.slackUserId)) {
          throw new SlackMappingValidationError('AilaFlow user is already mapped');
        }
      }
      const changedBindings = changes.filter(change => {
        const bySlack = originalMappings.find(mapping => mapping.workspaceId === workspaceId && mapping.slackUserId === change.slackUserId);
        return change.userName === null ? bySlack !== undefined : bySlack?.userName !== change.userName;
      });
      for (const change of changedBindings) {
        db.prepare(`DELETE FROM slack_user_mappings WHERE workspaceId = ? AND slackUserId = ?`).run(workspaceId, change.slackUserId);
      }
      for (const change of changedBindings) {
        if (change.userName === null) {
          continue;
        }
        const bySlack = originalMappings.find(mapping => mapping.workspaceId === workspaceId && mapping.slackUserId === change.slackUserId);
        const generation = (bySlack?.generation ?? 0) + 1;
        const createdAt = bySlack?.createdAt ?? now;
        db.prepare(
          `
          INSERT INTO slack_user_mappings (
            workspaceId, slackUserId, userName, channelName, generation, deliveryStartMessageId, dmChannelId,
            welcomeStatus, welcomeAttemptCount, welcomeNextAttemptAt, welcomeSentAt, welcomeLastError, createdAt, updatedAt
          ) VALUES (?, ?, ?, 'default', ?, NULL, NULL, ?, 0, ?, NULL, NULL, ?, ?)
        `
        ).run(workspaceId, change.slackUserId, change.userName, generation, SlackMappingWelcomeStatus.PENDING, now, createdAt, now);
      }

      const mappingRevision = expectedRevision + 1;
      db.prepare(`UPDATE slack_configuration SET mappingRevision = ?, updatedAt = ? WHERE id = 1`).run(mappingRevision, now);
      return mappingRevision;
    });
  }

  public async deleteAll(_: AbortSignal, workspaceId: string, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      db.prepare(`DELETE FROM slack_user_mappings WHERE workspaceId = ?`).run(workspaceId);
    }, transaction);
  }

  public async initializeDeliveryCursor(
    _: AbortSignal,
    workspaceId: string,
    slackUserId: string,
    generation: number,
    messageId: number
  ): Promise<boolean> {
    return this.db.write(
      db =>
        db
          .prepare(
            `
            UPDATE slack_user_mappings SET deliveryStartMessageId = ?, updatedAt = ?
            WHERE workspaceId = ? AND slackUserId = ? AND generation = ? AND deliveryStartMessageId IS NULL
          `
          )
          .run(messageId, Date.now(), workspaceId, slackUserId, generation).changes > 0
    );
  }

  public async updateDeliveryCursorAfterReset(
    _: AbortSignal,
    workspaceId: string,
    slackUserId: string,
    generation: number,
    messageId: number
  ): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
        UPDATE slack_user_mappings SET deliveryStartMessageId = ?, updatedAt = ?
        WHERE workspaceId = ? AND slackUserId = ? AND generation = ?
      `
      ).run(messageId, Date.now(), workspaceId, slackUserId, generation);
    });
  }

  public async updateDmChannelId(_: AbortSignal, workspaceId: string, slackUserId: string, dmChannelId: string): Promise<void> {
    await this.db.write(db => {
      db.prepare(`UPDATE slack_user_mappings SET dmChannelId = ?, updatedAt = ? WHERE workspaceId = ? AND slackUserId = ?`).run(
        dmChannelId,
        Date.now(),
        workspaceId,
        slackUserId
      );
    });
  }

  public async getWelcomeCandidates(_: AbortSignal, now: number): Promise<SlackUserMapping[]> {
    return this.db.read(db => {
      const rows = db
        .prepare(
          `
          SELECT * FROM slack_user_mappings
          WHERE welcomeSentAt IS NULL AND welcomeStatus != ? AND (welcomeNextAttemptAt IS NULL OR welcomeNextAttemptAt <= ?)
          ORDER BY createdAt, slackUserId
        `
        )
        .all(SlackMappingWelcomeStatus.FAILED, now) as unknown as SlackUserMapping[];
      return rows.map(mapMapping);
    });
  }

  public async markWelcomeAttempt(_: AbortSignal, mapping: SlackUserMapping, nextAttemptAt: number, error: string): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
        UPDATE slack_user_mappings SET welcomeAttemptCount = welcomeAttemptCount + 1,
          welcomeNextAttemptAt = ?, welcomeLastError = ?, updatedAt = ?
        WHERE workspaceId = ? AND slackUserId = ? AND generation = ?
      `
      ).run(nextAttemptAt, error, Date.now(), mapping.workspaceId, mapping.slackUserId, mapping.generation);
    });
  }

  public async markWelcomeSent(_: AbortSignal, mapping: SlackUserMapping, dmChannelId: string, sentAt: number): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
        UPDATE slack_user_mappings SET welcomeStatus = ?, welcomeAttemptCount = welcomeAttemptCount + 1,
          welcomeNextAttemptAt = NULL, welcomeSentAt = ?, welcomeLastError = NULL, dmChannelId = ?, updatedAt = ?
        WHERE workspaceId = ? AND slackUserId = ? AND generation = ?
      `
      ).run(SlackMappingWelcomeStatus.SENT, sentAt, dmChannelId, sentAt, mapping.workspaceId, mapping.slackUserId, mapping.generation);
    });
  }

  public async markWelcomeFailed(_: AbortSignal, mapping: SlackUserMapping, error: string): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
        UPDATE slack_user_mappings SET welcomeStatus = ?, welcomeAttemptCount = welcomeAttemptCount + 1,
          welcomeNextAttemptAt = NULL, welcomeLastError = ?, updatedAt = ?
        WHERE workspaceId = ? AND slackUserId = ? AND generation = ?
      `
      ).run(SlackMappingWelcomeStatus.FAILED, error, Date.now(), mapping.workspaceId, mapping.slackUserId, mapping.generation);
    });
  }

  public async getCounts(_: AbortSignal, workspaceId: string): Promise<SlackMappingCounts> {
    return this.db.read(db => {
      const row = db
        .prepare(
          `
          SELECT COUNT(*) AS mapped,
            SUM(CASE WHEN welcomeStatus = ? THEN 1 ELSE 0 END) AS failedWelcome
          FROM slack_user_mappings WHERE workspaceId = ?
        `
        )
        .get(SlackMappingWelcomeStatus.FAILED, workspaceId) as { mapped: number; failedWelcome: number | null };
      return { mapped: row.mapped, failedWelcome: row.failedWelcome ?? 0 };
    });
  }
}

function mapMapping(row: SlackUserMapping): SlackUserMapping {
  return { ...row, channelName: 'default' };
}

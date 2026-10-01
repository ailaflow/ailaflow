import { DEFAULT_CHANNEL_NAME } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Transaction } from '../../core/transaction';
import { UserChannelRepository } from './user-channel-repository';
import { UserChannel } from './user-channel';

interface UserChannelRow {
  userName: string;
  name: string;
  prompt: string;
}

export class SqliteUserChannelRepository implements UserChannelRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'user_channels', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE user_channels (
            userName TEXT NOT NULL,
            name TEXT NOT NULL,
            prompt TEXT NOT NULL,

            PRIMARY KEY (userName, name),
            FOREIGN KEY (userName)
              REFERENCES users(name)
              ON DELETE CASCADE
          ) STRICT
        `);
        db.exec(`
          INSERT INTO user_channels (userName, name, prompt)
          SELECT users.name, '${DEFAULT_CHANNEL_NAME}', ''
          FROM users
          WHERE NOT EXISTS (
            SELECT 1
            FROM user_channels
            WHERE userName = users.name AND name = '${DEFAULT_CHANNEL_NAME}'
          )
        `);
      }
    });
  }

  public async upsert(_: AbortSignal, channel: UserChannel, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
          INSERT INTO user_channels (userName, name, prompt)
          VALUES (?, ?, ?)
          ON CONFLICT(userName, name) DO UPDATE SET
            prompt = excluded.prompt
        `
      ).run(channel.userName, channel.name, channel.prompt);
    }, transaction);
  }

  public async delete(_: AbortSignal, userName: string, channelName: string, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      db.prepare(`DELETE FROM user_channels WHERE userName = ? AND name = ?`).run(userName, channelName);
    }, transaction);
  }

  public async tryGet(_: AbortSignal, userName: string, channelName: string): Promise<UserChannel | null> {
    return this.db.read(db => {
      const row = db
        .prepare(
          `
            SELECT userName, name, prompt
            FROM user_channels
            WHERE userName = ? AND name = ?
            LIMIT 1
          `
        )
        .get(userName, channelName) as UserChannelRow | undefined;

      return row ? mapUserChannel(row) : null;
    });
  }

  public async getAll(_: AbortSignal, userName: string): Promise<UserChannel[]> {
    return this.db.read(db => {
      const rows = db
        .prepare(
          `
            SELECT userName, name, prompt
            FROM user_channels
            WHERE userName = ?
            ORDER BY name
          `
        )
        .all(userName) as unknown as UserChannelRow[];

      return rows.map(mapUserChannel);
    });
  }
}

function mapUserChannel(row: UserChannelRow): UserChannel {
  return new UserChannel(row.userName, row.name, row.prompt);
}

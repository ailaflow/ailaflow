import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Transaction } from '../../core/transaction';
import { UserChannelRepository } from './user-channel-repository';
import { UserChannel } from './user-channel';

interface UserChannelRow {
  userName: string;
  name: string;
  prompt: string;
  isDefault: number;
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
            isDefault INTEGER NOT NULL CHECK (isDefault IN (0, 1)),

            PRIMARY KEY (userName, name),
            FOREIGN KEY (userName)
              REFERENCES users(name)
              ON DELETE CASCADE
          ) STRICT
        `);
        db.exec(`
          CREATE UNIQUE INDEX user_channels_default_idx
          ON user_channels(userName)
          WHERE isDefault = 1
        `);
        db.exec(`
          INSERT INTO user_channels (userName, name, prompt, isDefault)
          SELECT name, 'default', '', 1
          FROM users
        `);
      }
    });
  }

  public async upsert(_: AbortSignal, channel: UserChannel, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      if (channel.isDefault) {
        db.prepare(`UPDATE user_channels SET isDefault = 0 WHERE userName = ? AND isDefault = 1`).run(channel.userName);
      }

      db.prepare(
        `
          INSERT INTO user_channels (userName, name, prompt, isDefault)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(userName, name) DO UPDATE SET
            prompt = excluded.prompt,
            isDefault = excluded.isDefault
        `
      ).run(channel.userName, channel.name, channel.prompt, channel.isDefault ? 1 : 0);
    }, transaction);
  }

  public async delete(_: AbortSignal, userName: string, channelName: string, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      db.prepare(`DELETE FROM user_channels WHERE userName = ? AND name = ?`).run(userName, channelName);
    }, transaction);
  }

  public async get(_: AbortSignal, userName: string): Promise<UserChannel | null> {
    return this.db.read(db => {
      const row = db
        .prepare(
          `
            SELECT userName, name, prompt, isDefault
            FROM user_channels
            WHERE userName = ? AND isDefault = 1
            LIMIT 1
          `
        )
        .get(userName) as UserChannelRow | undefined;

      return row ? mapUserChannel(row) : null;
    });
  }

  public async tryGet(_: AbortSignal, userName: string, channelName: string): Promise<UserChannel | null> {
    return this.db.read(db => {
      const row = db
        .prepare(
          `
            SELECT userName, name, prompt, isDefault
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
            SELECT userName, name, prompt, isDefault
            FROM user_channels
            WHERE userName = ?
            ORDER BY isDefault DESC, name
          `
        )
        .all(userName) as unknown as UserChannelRow[];

      return rows.map(mapUserChannel);
    });
  }
}

function mapUserChannel(row: UserChannelRow): UserChannel {
  return new UserChannel(row.userName, row.name, row.prompt, row.isDefault === 1);
}

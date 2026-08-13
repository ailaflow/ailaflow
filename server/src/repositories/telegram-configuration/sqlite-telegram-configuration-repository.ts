import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { TelegramBotConfiguration } from './telegram-bot-configuration';
import { TelegramConfigurationRepository } from './telegram-configuration-repository';

interface TelegramConfigurationRow {
  userName: string;
  channelName: string;
  botToken: string;
}

export class SqliteTelegramConfigurationRepository implements TelegramConfigurationRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS telegram_bot_configurations (
        userName TEXT NOT NULL,
        channelName TEXT NOT NULL,
        botToken TEXT NOT NULL,

        PRIMARY KEY (userName, channelName),
        FOREIGN KEY (userName)
          REFERENCES users(name)
          ON DELETE CASCADE
      ) STRICT
    `);
  }

  public async getForUser(_: AbortSignal, userName: string): Promise<TelegramBotConfiguration[]> {
    const rows = this.db
      .prepare(
        `
        SELECT userName, channelName, botToken
        FROM telegram_bot_configurations
        WHERE userName = ?
        ORDER BY channelName
      `
      )
      .all(userName) as unknown as TelegramConfigurationRow[];
    return rows.map(mapConfiguration);
  }

  public async tryGet(_: AbortSignal, userName: string, channelName: string): Promise<TelegramBotConfiguration | null> {
    const row = this.db
      .prepare(
        `
        SELECT userName, channelName, botToken
        FROM telegram_bot_configurations
        WHERE userName = ? AND channelName = ?
        LIMIT 1
      `
      )
      .get(userName, channelName) as TelegramConfigurationRow | undefined;
    return row ? mapConfiguration(row) : null;
  }

  public async upsert(_: AbortSignal, configuration: TelegramBotConfiguration): Promise<void> {
    this.db
      .prepare(
        `
        INSERT INTO telegram_bot_configurations (userName, channelName, botToken)
        VALUES (?, ?, ?)
        ON CONFLICT(userName, channelName) DO UPDATE SET
          botToken = excluded.botToken
      `
      )
      .run(configuration.userName, configuration.channelName, configuration.botToken);
  }

  public async delete(_: AbortSignal, userName: string, channelName: string): Promise<boolean> {
    return (
      this.db.prepare(`DELETE FROM telegram_bot_configurations WHERE userName = ? AND channelName = ?`).run(userName, channelName).changes >
      0
    );
  }
}

function mapConfiguration(row: TelegramConfigurationRow): TelegramBotConfiguration {
  return new TelegramBotConfiguration(row.userName, row.channelName, row.botToken);
}

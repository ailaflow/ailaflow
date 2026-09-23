import { SqliteDatabase } from '../../../core/sqlite-database';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { TelegramBotConfiguration } from './telegram-bot-configuration';
import { TelegramConfigurationRepository, TelegramConfigurationRepositoryError } from './telegram-configuration-repository';
import { Transaction } from '../../../core/transaction';

interface TelegramConfigurationRow {
  userName: string;
  channelName: string;
  botToken: string;
  botId: string | null;
  botUserName: string | null;
  telegramChatId: string | null;
  linkCode: string | null;
  lastUpdateId: number | null;
}

export class SqliteTelegramConfigurationRepository implements TelegramConfigurationRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'telegram_bot_configurations', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE telegram_bot_configurations (
            userName TEXT NOT NULL,
            channelName TEXT NOT NULL,
            botToken TEXT NOT NULL,
            botId TEXT,
            botUserName TEXT,
            telegramChatId TEXT,
            linkCode TEXT,
            lastUpdateId INTEGER,

            PRIMARY KEY (userName, channelName),
            FOREIGN KEY (userName)
              REFERENCES users(name)
              ON DELETE CASCADE
          ) STRICT
        `);
        db.exec(`
          CREATE UNIQUE INDEX telegram_bot_configurations_bot_id_idx
          ON telegram_bot_configurations(botId)
          WHERE botId IS NOT NULL
        `);
      }
    });
  }

  public async getAll(_: AbortSignal): Promise<TelegramBotConfiguration[]> {
    return this.db.read(db => {
      const rows = db
        .prepare(
          `
          SELECT userName, channelName, botToken, botId, botUserName, telegramChatId, linkCode, lastUpdateId
          FROM telegram_bot_configurations
          ORDER BY userName, channelName
        `
        )
        .all() as unknown as TelegramConfigurationRow[];
      return rows.map(mapConfiguration);
    });
  }

  public async getForUser(_: AbortSignal, userName: string): Promise<TelegramBotConfiguration[]> {
    return this.db.read(db => {
      const rows = db
        .prepare(
          `
          SELECT userName, channelName, botToken, botId, botUserName, telegramChatId, linkCode, lastUpdateId
          FROM telegram_bot_configurations
          WHERE userName = ?
          ORDER BY channelName
        `
        )
        .all(userName) as unknown as TelegramConfigurationRow[];
      return rows.map(mapConfiguration);
    });
  }

  public async tryGet(_: AbortSignal, userName: string, channelName: string): Promise<TelegramBotConfiguration | null> {
    return this.db.read(db => {
      const row = db
        .prepare(
          `
          SELECT userName, channelName, botToken, botId, botUserName, telegramChatId, linkCode, lastUpdateId
          FROM telegram_bot_configurations
          WHERE userName = ? AND channelName = ?
          LIMIT 1
        `
        )
        .get(userName, channelName) as TelegramConfigurationRow | undefined;
      return row ? mapConfiguration(row) : null;
    });
  }

  public async upsert(_: AbortSignal, configuration: TelegramBotConfiguration, transaction?: Transaction): Promise<void> {
    try {
      await this.db.write(db => {
        db.prepare(
          `
            INSERT INTO telegram_bot_configurations (
              userName, channelName, botToken, botId, botUserName, telegramChatId, linkCode, lastUpdateId
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(userName, channelName) DO UPDATE SET
              botToken = excluded.botToken,
              botId = excluded.botId,
              botUserName = excluded.botUserName,
              telegramChatId = excluded.telegramChatId,
              linkCode = excluded.linkCode,
              lastUpdateId = excluded.lastUpdateId
          `
        ).run(
          configuration.userName,
          configuration.channelName,
          configuration.botToken,
          configuration.botId,
          configuration.botUserName,
          configuration.telegramChatId,
          configuration.linkCode,
          configuration.lastUpdateId
        );
      }, transaction);
    } catch (error) {
      if (isDuplicateBotIdError(error)) {
        throw new TelegramConfigurationRepositoryError('This Telegram bot is already configured');
      }
      throw error;
    }
  }

  public async connectTelegramChat(
    _: AbortSignal,
    userName: string,
    channelName: string,
    telegramChatId: string,
    transaction?: Transaction
  ): Promise<void> {
    await this.db.write(db => {
      db.prepare(`UPDATE telegram_bot_configurations SET telegramChatId = ?, linkCode = NULL WHERE userName = ? AND channelName = ?`).run(
        telegramChatId,
        userName,
        channelName
      );
    }, transaction);
  }

  public async updateLastUpdateId(
    _: AbortSignal,
    userName: string,
    channelName: string,
    lastUpdateId: number,
    transaction?: Transaction
  ): Promise<void> {
    await this.db.write(db => {
      db.prepare(`UPDATE telegram_bot_configurations SET lastUpdateId = ? WHERE userName = ? AND channelName = ?`).run(
        lastUpdateId,
        userName,
        channelName
      );
    }, transaction);
  }

  public async delete(_: AbortSignal, userName: string, channelName: string, transaction?: Transaction): Promise<boolean> {
    return this.db.write(
      db =>
        db.prepare(`DELETE FROM telegram_bot_configurations WHERE userName = ? AND channelName = ?`).run(userName, channelName).changes > 0,
      transaction
    );
  }
}

function mapConfiguration(row: TelegramConfigurationRow): TelegramBotConfiguration {
  return new TelegramBotConfiguration(
    row.userName,
    row.channelName,
    row.botToken,
    row.botId,
    row.botUserName,
    row.telegramChatId,
    row.linkCode,
    row.lastUpdateId
  );
}

function isDuplicateBotIdError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('UNIQUE constraint failed: telegram_bot_configurations.botId');
}

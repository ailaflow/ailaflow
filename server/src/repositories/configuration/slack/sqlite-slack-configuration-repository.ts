import { SqliteDatabase } from '../../../core/sqlite-database';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { Transaction } from '../../../core/transaction';
import { SlackConfigurationRepository } from './slack-configuration-repository';
import { SlackConfiguration } from './slack-types';

export class SqliteSlackConfigurationRepository implements SlackConfigurationRepository {
  private readonly db: SqliteDatabase;

  public constructor(databases: SqliteDatabases) {
    this.db = databases.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'slack_configuration', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE slack_configuration (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            appToken TEXT NOT NULL,
            botToken TEXT NOT NULL,
            appId TEXT NOT NULL,
            workspaceId TEXT NOT NULL,
            workspaceName TEXT NOT NULL,
            botUserId TEXT NOT NULL,
            mappingRevision INTEGER NOT NULL,
            configuredAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL
          ) STRICT
        `);
      }
    });
  }

  public async tryGet(_: AbortSignal): Promise<SlackConfiguration | null> {
    return this.db.read(db => {
      const row = db.prepare(`SELECT * FROM slack_configuration WHERE id = 1`).get() as (SlackConfiguration & { id: number }) | undefined;
      if (!row) {
        return null;
      }
      const { id: _id, ...configuration } = row;
      return configuration;
    });
  }

  public async save(_: AbortSignal, configuration: SlackConfiguration, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
        INSERT INTO slack_configuration (
          id, appToken, botToken, appId, workspaceId, workspaceName, botUserId, mappingRevision, configuredAt, updatedAt
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          appToken = excluded.appToken,
          botToken = excluded.botToken,
          appId = excluded.appId,
          workspaceId = excluded.workspaceId,
          workspaceName = excluded.workspaceName,
          botUserId = excluded.botUserId,
          mappingRevision = excluded.mappingRevision,
          configuredAt = excluded.configuredAt,
          updatedAt = excluded.updatedAt
      `
      ).run(
        configuration.appToken,
        configuration.botToken,
        configuration.appId,
        configuration.workspaceId,
        configuration.workspaceName,
        configuration.botUserId,
        configuration.mappingRevision,
        configuration.configuredAt,
        configuration.updatedAt
      );
    }, transaction);
  }

  public async delete(_: AbortSignal, transaction?: Transaction): Promise<boolean> {
    return this.db.write(db => db.prepare(`DELETE FROM slack_configuration WHERE id = 1`).run().changes > 0, transaction);
  }
}

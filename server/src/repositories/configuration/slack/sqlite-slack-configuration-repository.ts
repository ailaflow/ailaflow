import { SqliteDatabase } from '../../../core/sqlite-database';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { Transaction } from '../../../core/transaction';
import { Cipher } from '../../../core/cipher/cipher';
import { CipherKey } from '../../../core/cipher/cipher-key-store';
import { SlackConfigurationRepository } from './slack-configuration-repository';
import { SlackConfiguration } from './slack-types';

interface SlackConfigurationRow extends Omit<SlackConfiguration, 'appToken' | 'botToken'> {
  id: number;
  appToken: string;
  botToken: string;
}

export class SqliteSlackConfigurationRepository implements SlackConfigurationRepository {
  private readonly db: SqliteDatabase;

  public constructor(
    databases: SqliteDatabases,
    private readonly cipher: Cipher
  ) {
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
    const row = await this.db.read(
      db => db.prepare(`SELECT * FROM slack_configuration WHERE id = 1`).get() as SlackConfigurationRow | undefined
    );
    if (!row) {
      return null;
    }
    const { id: _id, appToken: encryptedAppToken, botToken: encryptedBotToken, ...configuration } = row;
    const [appToken, botToken] = await Promise.all([
      this.cipher.decryptSecret(encryptedAppToken, CipherKey.InternalSecretEncryption),
      this.cipher.decryptSecret(encryptedBotToken, CipherKey.InternalSecretEncryption)
    ]);
    return { ...configuration, appToken, botToken };
  }

  public async save(_: AbortSignal, configuration: SlackConfiguration, transaction?: Transaction): Promise<void> {
    const [encryptedAppToken, encryptedBotToken] = await Promise.all([
      this.cipher.encryptSecret(configuration.appToken, CipherKey.InternalSecretEncryption),
      this.cipher.encryptSecret(configuration.botToken, CipherKey.InternalSecretEncryption)
    ]);
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
        encryptedAppToken,
        encryptedBotToken,
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

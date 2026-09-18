import { SqliteDatabase, SqliteDatabases } from '../../../core/sqlite-databases';
import { LlmConfiguration } from './llm-configuration';
import { LlmConfigurationRepository, LlmConfigurationRepositoryError } from './llm-configuration-repository';
import { LlmModelProviderConfiguration, LlmProviderConfiguration } from './llm-provider-configuration';
import { LlmProviderType, LlmUseCase } from '@ailaflow/shared';
import { LlmUseCaseConfiguration } from './llm-use-case-configuration';
import { Transaction } from '../../../core/transaction';
import { Cipher } from '../../../core/cipher/cipher';

interface ProviderRow {
  id: string;
  name: string;
  type: number;
  url: string | null;
  apiKey: string | null;
  models: string;
}

interface UseCaseRow {
  useCase: number;
  providerId: string;
  modelName: string;
  modelContextWindow: number | null;
  effectiveContextWindowPercent: number;
}

export class SqliteLlmConfigurationRepository implements LlmConfigurationRepository {
  private readonly db: SqliteDatabase;

  public constructor(
    dbs: SqliteDatabases,
    private readonly cipher: Cipher
  ) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.write(db => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS llm_providers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          type INTEGER NOT NULL,
          url TEXT,
          apiKey TEXT,
          models TEXT NOT NULL
        ) STRICT
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS llm_use_case_configurations (
          useCase INTEGER PRIMARY KEY,
          providerId TEXT NOT NULL,
          modelName TEXT NOT NULL,
          modelContextWindow INTEGER,
          effectiveContextWindowPercent INTEGER NOT NULL,

          FOREIGN KEY (providerId)
            REFERENCES llm_providers(id)
            ON DELETE RESTRICT
        ) STRICT
      `);
    });
  }

  public async get(_: AbortSignal): Promise<LlmConfiguration> {
    const { providerRows, useCaseRows } = await this.db.read(db => {
      const providerRows = db
        .prepare(`SELECT id, name, type, url, apiKey, models FROM llm_providers ORDER BY name, id`)
        .all() as unknown as ProviderRow[];
      const useCaseRows = db
        .prepare(
          `SELECT useCase, providerId, modelName, modelContextWindow, effectiveContextWindowPercent FROM llm_use_case_configurations ORDER BY useCase`
        )
        .all() as unknown as UseCaseRow[];
      return { providerRows, useCaseRows };
    });

    return new LlmConfiguration(await Promise.all(providerRows.map(row => this.mapProvider(row))), useCaseRows.map(mapUseCase));
  }

  public async tryGetProvider(_: AbortSignal, id: string): Promise<LlmProviderConfiguration | null> {
    const row = await this.db.read(
      db =>
        db.prepare(`SELECT id, name, type, url, apiKey, models FROM llm_providers WHERE id = ? LIMIT 1`).get(id) as ProviderRow | undefined
    );
    return row ? this.mapProvider(row) : null;
  }

  public async insertProvider(_: AbortSignal, provider: LlmProviderConfiguration, transaction?: Transaction): Promise<void> {
    const [encryptedUrl, encryptedApiKey] = await Promise.all([
      this.encryptWhenPresent(provider.url),
      this.encryptWhenPresent(provider.apiKey)
    ]);
    try {
      await this.db.write(db => {
        db.prepare(`INSERT INTO llm_providers (id, name, type, url, apiKey, models) VALUES (?, ?, ?, ?, ?, ?)`).run(
          provider.id,
          provider.name,
          provider.type,
          encryptedUrl,
          encryptedApiKey,
          JSON.stringify(provider.models)
        );
      }, transaction);
    } catch (error) {
      if (isUniqueNameError(error)) {
        throw new LlmConfigurationRepositoryError('An LLM provider name is already in use');
      }
      throw error;
    }
  }

  public async updateProvider(_: AbortSignal, provider: LlmProviderConfiguration, transaction?: Transaction): Promise<void> {
    const [encryptedUrl, encryptedApiKey] = await Promise.all([
      this.encryptWhenPresent(provider.url),
      this.encryptWhenPresent(provider.apiKey)
    ]);
    try {
      await this.db.write(db => {
        db.prepare(`UPDATE llm_providers SET name = ?, type = ?, url = ?, apiKey = ?, models = ? WHERE id = ?`).run(
          provider.name,
          provider.type,
          encryptedUrl,
          encryptedApiKey,
          JSON.stringify(provider.models),
          provider.id
        );
      }, transaction);
    } catch (error) {
      if (isUniqueNameError(error)) {
        throw new LlmConfigurationRepositoryError('An LLM provider name is already in use');
      }
      throw error;
    }
  }

  public async deleteProvider(_: AbortSignal, id: string, transaction?: Transaction): Promise<boolean> {
    try {
      return await this.db.write(db => db.prepare(`DELETE FROM llm_providers WHERE id = ?`).run(id).changes > 0, transaction);
    } catch (error) {
      if (isForeignKeyError(error)) {
        throw new LlmConfigurationRepositoryError('The LLM provider is assigned to a use case');
      }
      throw error;
    }
  }

  public async saveUseCases(
    _: AbortSignal,
    configurations: LlmUseCaseConfiguration[],
    removedUseCases: LlmUseCase[],
    transaction?: Transaction
  ): Promise<void> {
    try {
      await this.db.write(db => {
        const statement = db.prepare(`
          INSERT INTO llm_use_case_configurations (useCase, providerId, modelName, modelContextWindow, effectiveContextWindowPercent)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(useCase) DO UPDATE SET
            providerId = excluded.providerId,
            modelName = excluded.modelName,
            modelContextWindow = excluded.modelContextWindow,
            effectiveContextWindowPercent = excluded.effectiveContextWindowPercent
        `);
        const deleteStatement = db.prepare(`DELETE FROM llm_use_case_configurations WHERE useCase = ?`);
        for (const useCase of removedUseCases) {
          deleteStatement.run(useCase);
        }
        for (const configuration of configurations) {
          statement.run(
            configuration.useCase,
            configuration.providerId,
            configuration.modelName,
            configuration.modelContextWindow ?? null,
            configuration.effectiveContextWindowPercent
          );
        }
      }, transaction);
    } catch (error) {
      if (isForeignKeyError(error)) {
        throw new LlmConfigurationRepositoryError('An assigned LLM provider does not exist');
      }
      throw error;
    }
  }

  private async mapProvider(row: ProviderRow): Promise<LlmProviderConfiguration> {
    const type = row.type as LlmProviderType;
    const [url, apiKey] = await Promise.all([this.decryptWhenPresent(row.url), this.decryptWhenPresent(row.apiKey)]);
    return new LlmProviderConfiguration(row.id, row.name, type, url, apiKey, JSON.parse(row.models) as LlmModelProviderConfiguration[]);
  }

  private encryptWhenPresent(value: string | null): Promise<string | null> {
    return value === null ? Promise.resolve(null) : this.cipher.encryptData(value);
  }

  private decryptWhenPresent(value: string | null): Promise<string | null> {
    return value === null ? Promise.resolve(null) : this.cipher.decryptData(value);
  }
}

function mapUseCase(row: UseCaseRow): LlmUseCaseConfiguration {
  return new LlmUseCaseConfiguration(
    row.useCase as LlmUseCase,
    row.providerId,
    row.modelName,
    row.modelContextWindow ?? undefined,
    row.effectiveContextWindowPercent
  );
}

function isUniqueNameError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('UNIQUE constraint failed: llm_providers.name');
}

function isForeignKeyError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('FOREIGN KEY constraint failed');
}

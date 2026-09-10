import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { LlmConfiguration } from './llm-configuration';
import { LlmConfigurationRepository, LlmConfigurationRepositoryError } from './llm-configuration-repository';
import { LlmModelProviderConfiguration, LlmProviderConfiguration } from './llm-provider-configuration';
import { LlmProviderType, LlmUseCase } from '@ailaflow/model';
import { LlmUseCaseConfiguration } from './llm-use-case-configuration';

interface ProviderRow {
  id: string;
  name: string;
  type: number;
  url: string | null;
  apiKey: string | null;
  serializedModels: string;
}

interface UseCaseRow {
  useCase: number;
  providerId: string;
  modelName: string;
  modelContextWindow: number | null;
  effectiveContextWindowPercent: number;
}

export class SqliteLlmConfigurationRepository implements LlmConfigurationRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS llm_providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        type INTEGER NOT NULL,
        url TEXT,
        apiKey TEXT,
        serializedModels TEXT NOT NULL
      ) STRICT
    `);
    this.db.exec(`
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
  }

  public async get(_: AbortSignal): Promise<LlmConfiguration> {
    const providerRows = this.db
      .prepare(`SELECT id, name, type, url, apiKey, serializedModels FROM llm_providers ORDER BY name, id`)
      .all() as unknown as ProviderRow[];
    const useCaseRows = this.db
      .prepare(
        `SELECT useCase, providerId, modelName, modelContextWindow, effectiveContextWindowPercent FROM llm_use_case_configurations ORDER BY useCase`
      )
      .all() as unknown as UseCaseRow[];
    return new LlmConfiguration(providerRows.map(mapProvider), useCaseRows.map(mapUseCase));
  }

  public async tryGetProvider(_: AbortSignal, id: string): Promise<LlmProviderConfiguration | null> {
    const row = this.db.prepare(`SELECT id, name, type, url, apiKey, serializedModels FROM llm_providers WHERE id = ? LIMIT 1`).get(id) as
      | ProviderRow
      | undefined;
    return row ? mapProvider(row) : null;
  }

  public async insertProvider(_: AbortSignal, provider: LlmProviderConfiguration): Promise<void> {
    try {
      this.db
        .prepare(`INSERT INTO llm_providers (id, name, type, url, apiKey, serializedModels) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(provider.id, provider.name, provider.type, provider.url, provider.apiKey, JSON.stringify(provider.models));
    } catch (error) {
      if (isUniqueNameError(error)) {
        throw new LlmConfigurationRepositoryError('An LLM provider name is already in use');
      }
      throw error;
    }
  }

  public async updateProvider(_: AbortSignal, provider: LlmProviderConfiguration): Promise<void> {
    try {
      this.db
        .prepare(`UPDATE llm_providers SET name = ?, type = ?, url = ?, apiKey = ?, serializedModels = ? WHERE id = ?`)
        .run(provider.name, provider.type, provider.url, provider.apiKey, JSON.stringify(provider.models), provider.id);
    } catch (error) {
      if (isUniqueNameError(error)) {
        throw new LlmConfigurationRepositoryError('An LLM provider name is already in use');
      }
      throw error;
    }
  }

  public async deleteProvider(_: AbortSignal, id: string): Promise<boolean> {
    try {
      return this.db.prepare(`DELETE FROM llm_providers WHERE id = ?`).run(id).changes > 0;
    } catch (error) {
      if (isForeignKeyError(error)) {
        throw new LlmConfigurationRepositoryError('The LLM provider is assigned to a use case');
      }
      throw error;
    }
  }

  public async saveUseCases(_: AbortSignal, configurations: LlmUseCaseConfiguration[], removedUseCases: LlmUseCase[]): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO llm_use_case_configurations (useCase, providerId, modelName, modelContextWindow, effectiveContextWindowPercent)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(useCase) DO UPDATE SET
        providerId = excluded.providerId,
        modelName = excluded.modelName,
        modelContextWindow = excluded.modelContextWindow,
        effectiveContextWindowPercent = excluded.effectiveContextWindowPercent
    `);
    try {
      this.db.exec(`BEGIN`);
      const deleteStatement = this.db.prepare(`DELETE FROM llm_use_case_configurations WHERE useCase = ?`);
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
      this.db.exec(`COMMIT`);
    } catch (error) {
      this.db.exec(`ROLLBACK`);
      if (isForeignKeyError(error)) {
        throw new LlmConfigurationRepositoryError('An assigned LLM provider does not exist');
      }
      throw error;
    }
  }
}

function mapProvider(row: ProviderRow): LlmProviderConfiguration {
  const type = row.type as LlmProviderType;
  return new LlmProviderConfiguration(
    row.id,
    row.name,
    type,
    row.url,
    row.apiKey,
    JSON.parse(row.serializedModels) as LlmModelProviderConfiguration[]
  );
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

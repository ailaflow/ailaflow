import { JsonSchema, ProcessDefinition } from '@aila/model';
import { ProcessRepository, ProcessRepositoryError } from './process-repository';
import { Process } from './process';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { DatabaseSync } from 'node:sqlite';
import { ProcessResourceId } from './process-resource-id';

interface ProcessRow {
  name: string;
  description: string;
  userAccessExpression: string;
  nSteps: number;
  isPausable: number;
  startVariableSchemas: string;
  serializedDefinition: string;
  definitionHash: string;
}

export class SqliteProcessRepository implements ProcessRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processes (
        name TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        userAccessExpression TEXT NOT NULL,
        nSteps INTEGER NOT NULL,
        isPausable INTEGER NOT NULL DEFAULT 0 CHECK (isPausable IN (0, 1)),
        startVariableSchemas TEXT NOT NULL,
        serializedDefinition TEXT NOT NULL,
        definitionHash TEXT NOT NULL
      ) STRICT
    `);
  }

  public async insert(_: AbortSignal, process: Process): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO processes (
        name, description, userAccessExpression, nSteps, isPausable, startVariableSchemas, serializedDefinition, definitionHash
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      statement.run(
        process.name,
        process.description,
        process.userAccessExpression,
        process.nSteps,
        process.isPausable ? 1 : 0,
        serializeStartVariableSchemas(process.startVariableSchemas),
        JSON.stringify(process.definition),
        process.hash
      );
    } catch (e) {
      if (isDuplicateProcessNameSqliteError(e)) {
        throw new ProcessRepositoryError('A process name is already in use');
      }
      throw e;
    }
  }

  public async update(_: AbortSignal, process: Process): Promise<void> {
    const statement = this.db.prepare(`
      UPDATE processes
      SET
        description = ?,
        userAccessExpression = ?,
        nSteps = ?,
        isPausable = ?,
        startVariableSchemas = ?,
        serializedDefinition = ?,
        definitionHash = ?
      WHERE name = ?
    `);
    statement.run(
      process.description,
      process.userAccessExpression,
      process.nSteps,
      process.isPausable ? 1 : 0,
      serializeStartVariableSchemas(process.startVariableSchemas),
      JSON.stringify(process.definition),
      process.hash,
      process.name
    );
  }

  public async delete(abortSignal: AbortSignal, name: string): Promise<boolean> {
    abortSignal.throwIfAborted();

    const deleteAccessStatement = this.db.prepare(`
      DELETE FROM resource_access_rule_groups
      WHERE resource_id = ?
    `);
    const deleteProcessStatement = this.db.prepare(`
      DELETE FROM processes
      WHERE name = ?
    `);

    try {
      this.db.exec(`BEGIN`);
      deleteAccessStatement.run(ProcessResourceId.create(name));
      const deleted = deleteProcessStatement.run(name).changes > 0;
      this.db.exec(`COMMIT`);
      return deleted;
    } catch (e) {
      this.db.exec(`ROLLBACK`);
      throw e;
    }
  }

  public async tryGetByName(_: AbortSignal, name: string): Promise<Process | null> {
    const statement = this.db.prepare(`
      SELECT name, description, userAccessExpression, nSteps, isPausable, startVariableSchemas, serializedDefinition, definitionHash
      FROM processes
      WHERE name = ?
      LIMIT 1
    `);
    const row = statement.get(name) as ProcessRow | undefined;

    return row
      ? new Process(
          row.name,
          row.description,
          row.userAccessExpression,
          JSON.parse(row.serializedDefinition) as ProcessDefinition,
          row.definitionHash,
          JSON.parse(row.startVariableSchemas) as Record<string, JsonSchema>,
          row.nSteps,
          row.isPausable === 1
        )
      : null;
  }
}

function serializeStartVariableSchemas(startVariableSchemas: Record<string, JsonSchema> | null): string {
  return JSON.stringify(startVariableSchemas ?? {});
}

function isDuplicateProcessNameSqliteError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ERR_SQLITE_ERROR' &&
    error.message.includes('UNIQUE constraint failed: processes.name')
  );
}

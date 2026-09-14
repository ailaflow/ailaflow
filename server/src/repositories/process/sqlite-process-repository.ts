import { JsonSchema, ProcessDefinition } from '@ailaflow/shared';
import { ProcessRepository, ProcessRepositoryError } from './process-repository';
import { Process } from './process';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { DatabaseSync } from 'node:sqlite';
import { ProcessResourceId } from './process-resource-id';
import { AsyncMutex } from '../../core/async-mutex';
import { SqliteTransaction } from '../../core/sqlite-transaction';
import { Transaction } from '../../core/transaction';

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
  private readonly dbMutex: AsyncMutex;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
    this.dbMutex = dbs.modelDbMutex;
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

  public async insert(_: AbortSignal, process: Process, transaction?: Transaction): Promise<void> {
    const t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
    try {
      const statement = this.db.prepare(`
        INSERT INTO processes (
          name, description, userAccessExpression, nSteps, isPausable, startVariableSchemas, serializedDefinition, definitionHash
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
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
      await t.commit();
    } catch (e) {
      await t.rollback();
      if (isDuplicateProcessNameSqliteError(e)) {
        throw new ProcessRepositoryError('A process name is already in use');
      }
      throw e;
    }
  }

  public async update(_: AbortSignal, process: Process, transaction?: Transaction): Promise<void> {
    const t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
    try {
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
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  public async delete(abortSignal: AbortSignal, name: string, transaction?: Transaction): Promise<boolean> {
    abortSignal.throwIfAborted();
    const t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
    try {
      const deleteAccessStatement = this.db.prepare(`
        DELETE FROM resource_access_rule_groups
        WHERE resource_id = ?
      `);
      const deleteProcessStatement = this.db.prepare(`
        DELETE FROM processes
        WHERE name = ?
      `);
      deleteAccessStatement.run(ProcessResourceId.create(name));
      const deleted = deleteProcessStatement.run(name).changes > 0;
      await t.commit();
      return deleted;
    } catch (e) {
      await t.rollback();
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

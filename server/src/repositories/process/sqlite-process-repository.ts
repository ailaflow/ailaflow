import { JsonSchema, ProcessDefinition, ProcessDisplay } from '@ailaflow/shared';
import { ProcessRepository, ProcessRepositoryError } from './process-repository';
import { Process } from './process';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { ProcessResourceId } from './process-resource-id';
import { Transaction } from '../../core/transaction';

interface ProcessRow {
  name: string;
  description: string;
  userAccessExpression: string;
  display: ProcessDisplay;
  nSteps: number;
  isPausable: number;
  startVariableSchemas: string;
  serializedDefinition: string;
  definitionHash: string;
}

export class SqliteProcessRepository implements ProcessRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal) {
    await this.db.write(db => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS processes (
          name TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          userAccessExpression TEXT NOT NULL,
          display INTEGER NOT NULL,
          nSteps INTEGER NOT NULL,
          isPausable INTEGER NOT NULL DEFAULT 0 CHECK (isPausable IN (0, 1)),
          startVariableSchemas TEXT NOT NULL,
          serializedDefinition TEXT NOT NULL,
          definitionHash TEXT NOT NULL
        ) STRICT
      `);
    });
  }

  public async insert(_: AbortSignal, process: Process, transaction?: Transaction): Promise<void> {
    try {
      await this.db.write(db => {
        const statement = db.prepare(`
          INSERT INTO processes (
            name, description, userAccessExpression, display, nSteps, isPausable, startVariableSchemas, serializedDefinition, definitionHash
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        statement.run(
          process.name,
          process.description,
          process.userAccessExpression,
          process.display,
          process.nSteps,
          process.isPausable ? 1 : 0,
          serializeStartVariableSchemas(process.startVariableSchemas),
          JSON.stringify(process.definition),
          process.hash
        );
      }, transaction);
    } catch (e) {
      if (isDuplicateProcessNameSqliteError(e)) {
        throw new ProcessRepositoryError('A process name is already in use');
      }
      throw e;
    }
  }

  public async update(_: AbortSignal, process: Process, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = db.prepare(`
        UPDATE processes
        SET
          description = ?,
          userAccessExpression = ?,
          display = ?,
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
        process.display,
        process.nSteps,
        process.isPausable ? 1 : 0,
        serializeStartVariableSchemas(process.startVariableSchemas),
        JSON.stringify(process.definition),
        process.hash,
        process.name
      );
    }, transaction);
  }

  public async delete(_: AbortSignal, name: string, transaction?: Transaction): Promise<boolean> {
    return this.db.write(db => {
      const deleteAccessStatement = db.prepare(`
        DELETE FROM resource_access_rule_groups
        WHERE resource_id = ?
      `);
      const deleteProcessStatement = db.prepare(`
        DELETE FROM processes
        WHERE name = ?
      `);
      deleteAccessStatement.run(ProcessResourceId.create(name));
      return deleteProcessStatement.run(name).changes > 0;
    }, transaction);
  }

  public async tryGetByName(_: AbortSignal, name: string): Promise<Process | null> {
    return this.db.read(db => {
      const statement = db.prepare(`
        SELECT name, description, userAccessExpression, display, nSteps, isPausable, startVariableSchemas, serializedDefinition, definitionHash
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
            row.display,
            JSON.parse(row.serializedDefinition) as ProcessDefinition,
            row.definitionHash,
            JSON.parse(row.startVariableSchemas) as Record<string, JsonSchema>,
            row.nSteps,
            row.isPausable === 1
          )
        : null;
    });
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

import { JsonSchema, ProcessDefinition, ProcessDisplay, ProcessExecutionMode } from '@ailaflow/shared';
import { ProcessRepository, ProcessRepositoryError } from './process-repository';
import { Process } from './process';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ProcessResourceId } from './process-resource-id';
import { Transaction } from '../../core/transaction';

interface ProcessRow {
  name: string;
  description: string;
  userAccessExpression: string;
  display: ProcessDisplay;
  executionMode: ProcessExecutionMode;
  icon: string | null;
  nSteps: number;
  nReturnSteps: number;
  nTasksSteps: number;
  sandboxNames: string;
  startVariableSchemas: string;
  definition: string;
  definitionHash: string;
}

export class SqliteProcessRepository implements ProcessRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal) {
    await this.db.setup(2, 'processes', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE processes (
            name TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            userAccessExpression TEXT NOT NULL,
            display INTEGER NOT NULL,
            executionMode INTEGER NOT NULL,
            icon TEXT,
            nSteps INTEGER NOT NULL,
            nReturnSteps INTEGER NOT NULL,
            nTasksSteps INTEGER NOT NULL,
            sandboxNames TEXT NOT NULL DEFAULT '[]',
            startVariableSchemas TEXT NOT NULL,
            definition TEXT NOT NULL,
            definitionSize INTEGER NOT NULL,
            definitionHash TEXT NOT NULL
          ) STRICT
        `);
      } else if (version < 2) {
        db.exec(`ALTER TABLE processes ADD COLUMN sandboxNames TEXT NOT NULL DEFAULT '[]'`);
      }
    });
  }

  public async insert(_: AbortSignal, process: Process, transaction?: Transaction): Promise<void> {
    try {
      const definition = JSON.stringify(process.definition);
      await this.db.write(db => {
        const statement = db.prepare(`
          INSERT INTO processes (
            name, description, userAccessExpression, display, executionMode, icon, nSteps, nReturnSteps, nTasksSteps,
            sandboxNames, startVariableSchemas, definition, definitionSize, definitionHash
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        statement.run(
          process.name,
          process.description,
          process.userAccessExpression,
          process.display,
          process.executionMode,
          process.icon,
          process.nSteps,
          process.nReturnSteps,
          process.nTasksSteps,
          JSON.stringify(process.sandboxNames),
          serializeStartVariableSchemas(process.startVariableSchemas),
          definition,
          definition.length,
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
    const definition = JSON.stringify(process.definition);
    await this.db.write(db => {
      const statement = db.prepare(`
        UPDATE processes
        SET
          description = ?,
          userAccessExpression = ?,
          display = ?,
          executionMode = ?,
          icon = ?,
          nSteps = ?,
          nReturnSteps = ?,
          nTasksSteps = ?,
          sandboxNames = ?,
          startVariableSchemas = ?,
          definition = ?,
          definitionSize = ?,
          definitionHash = ?
        WHERE name = ?
      `);
      statement.run(
        process.description,
        process.userAccessExpression,
        process.display,
        process.executionMode,
        process.icon,
        process.nSteps,
        process.nReturnSteps,
        process.nTasksSteps,
        JSON.stringify(process.sandboxNames),
        serializeStartVariableSchemas(process.startVariableSchemas),
        definition,
        definition.length,
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
        SELECT name, description, userAccessExpression, display, executionMode, icon, nSteps, nReturnSteps, nTasksSteps,
          sandboxNames, startVariableSchemas, definition, definitionHash
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
            row.executionMode,
            row.icon,
            JSON.parse(row.definition) as ProcessDefinition,
            row.definitionHash,
            JSON.parse(row.startVariableSchemas) as Record<string, JsonSchema>,
            row.nSteps,
            row.nReturnSteps,
            row.nTasksSteps,
            JSON.parse(row.sandboxNames) as string[]
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

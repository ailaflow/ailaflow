import { ProcessDefinition } from '@aila/model';
import { ProcessRepository, ProcessRepositoryError } from './process-repository';
import { Process } from './process';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { DatabaseSync } from 'node:sqlite';

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
        nStartInputs INTEGER NOT NULL,
        nSteps INTEGER NOT NULL,
        serializedDefinition TEXT NOT NULL,
        definitionHash TEXT NOT NULL
      ) STRICT
    `);
  }

  public async insert(_: AbortSignal, process: Process): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO processes (name, description, userAccessExpression, nStartInputs, nSteps, serializedDefinition, definitionHash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      statement.run(
        process.name,
        process.description,
        process.userAccessExpression,
        process.nStartInputs,
        process.nSteps,
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
        nStartInputs = ?,
        nSteps = ?,
        serializedDefinition = ?,
        definitionHash = ?
      WHERE name = ?
    `);
    statement.run(
      process.description,
      process.userAccessExpression,
      process.nStartInputs,
      process.nSteps,
      JSON.stringify(process.definition),
      process.hash,
      process.name
    );
  }

  public async tryGetByName(_: AbortSignal, name: string): Promise<Process | null> {
    const statement = this.db.prepare(`
      SELECT name, description, userAccessExpression, nStartInputs, nSteps, serializedDefinition, definitionHash
      FROM processes
      WHERE name = ?
      LIMIT 1
    `);
    const row = statement.get(name) as
      | {
          name: string;
          description: string;
          userAccessExpression: string;
          nStartInputs: number;
          nSteps: number;
          serializedDefinition: string;
          definitionHash: string;
        }
      | undefined;

    return row
      ? new Process(
          row.name,
          row.description,
          row.userAccessExpression,
          JSON.parse(row.serializedDefinition) as ProcessDefinition,
          row.definitionHash,
          row.nStartInputs,
          row.nSteps
        )
      : null;
  }
}

function isDuplicateProcessNameSqliteError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ERR_SQLITE_ERROR' &&
    error.message.includes('UNIQUE constraint failed: processes.name')
  );
}

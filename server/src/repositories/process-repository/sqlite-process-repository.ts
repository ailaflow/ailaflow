import { ProcessDefinition } from '@aila/model';
import { ProcessRepositoryError, ProcessRepository } from './process-repository';
import { Process } from './process';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { DatabaseSync } from 'node:sqlite';

export class SqliteProcessRepository implements ProcessRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        userList TEXT NOT NULL,
        nStartInputs INTEGER NOT NULL,
        nSteps INTEGER NOT NULL,
        serializedDefinition TEXT NOT NULL,
        definitionHash TEXT NOT NULL
      ) STRICT
    `);
  }

  public async insert(process: Process): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO processes (id, name, description, userList, nStartInputs, nSteps, serializedDefinition, definitionHash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      statement.run(
        process.id,
        process.name,
        process.description,
        process.userList,
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

  public async update(process: Process): Promise<void> {
    const statement = this.db.prepare(`
      UPDATE processes
      SET
        name = ?,
        description = ?,
        userList = ?,
        nStartInputs = ?,
        nSteps = ?,
        serializedDefinition = ?,
        definitionHash = ?
      WHERE id = ?
    `);
    try {
      statement.run(
        process.name,
        process.description,
        process.userList,
        process.nStartInputs,
        process.nSteps,
        JSON.stringify(process.definition),
        process.hash,
        process.id
      );
    } catch (e) {
      if (isDuplicateProcessNameSqliteError(e)) {
        throw new ProcessRepositoryError('A process name is already in use');
      }
      throw e;
    }
  }

  public async tryGetById(id: string): Promise<Process | null> {
    const statement = this.db.prepare(`
      SELECT id, name, description, userList, nStartInputs, nSteps, serializedDefinition, definitionHash
      FROM processes
      WHERE id = ?
      LIMIT 1
    `);
    const row = statement.get(id) as
      | {
          id: string;
          name: string;
          description: string;
          userList: string;
          nStartInputs: number;
          nSteps: number;
          serializedDefinition: string;
          definitionHash: string;
        }
      | undefined;

    return row
      ? new Process(
          row.id,
          row.name,
          row.description,
          row.userList,
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

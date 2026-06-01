import { ProcessDefinition } from '@aila/model';
import { Process, ProcessRepository } from './process-repository';
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
        nInputs INTEGER NOT NULL,
        nOutputs INTEGER NOT NULL,
        definition TEXT NOT NULL
      )
    `);
  }

  public async insert(process: Process): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO processes (id, name, description, userList, nInputs, nOutputs, definition)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    statement.run(
      process.id,
      process.name,
      process.description,
      process.userList,
      process.nInputs,
      process.nOutputs,
      JSON.stringify(process.definition)
    );
  }

  public async update(process: Process): Promise<void> {
    const statement = this.db.prepare(`
      UPDATE processes
      SET
        name = ?,
        description = ?,
        userList = ?,
        nInputs = ?,
        nOutputs = ?,
        definition = ?
      WHERE id = ?
    `);
    statement.run(
      process.name,
      process.description,
      process.userList,
      process.nInputs,
      process.nOutputs,
      JSON.stringify(process.definition),
      process.id
    );
  }

  public async tryGetById(id: string): Promise<Process | null> {
    const statement = this.db.prepare(`
      SELECT id, name, description, userList, nInputs, nOutputs, definition
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
          nInputs: number;
          nOutputs: number;
          definition: string;
        }
      | undefined;

    return row
      ? new Process(
          row.id,
          row.name,
          row.description,
          row.userList,
          JSON.parse(row.definition) as ProcessDefinition,
          row.nInputs,
          row.nOutputs
        )
      : null;
  }
}

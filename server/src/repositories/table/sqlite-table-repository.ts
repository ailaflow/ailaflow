import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableRepository } from './table-repository';
import { Table } from './table';

export class SqliteTableRepository implements TableRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tables (
        name TEXT PRIMARY KEY,
        description TEXT NOT NULL
      ) STRICT
    `);
  }

  public async insert(_: AbortSignal, table: Table): Promise<void> {
    const insertTableStatement = this.db.prepare(`
      INSERT INTO tables (name, description)
      VALUES (?, ?)
    `);

    try {
      this.db.exec(`BEGIN`);
      insertTableStatement.run(table.name, table.description);
      this.db.exec(`
        CREATE TABLE ${SqliteTableDataNameProvider.getName(table.name)} (
          pk TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        ) STRICT
      `);
      this.db.exec(`COMMIT`);
    } catch (e) {
      this.db.exec(`ROLLBACK`);
      throw e;
    }
  }

  public async update(_: AbortSignal, table: Table): Promise<void> {
    const statement = this.db.prepare(`
      UPDATE tables
      SET description = ?
      WHERE name = ?
    `);
    statement.run(table.description, table.name);
  }

  public async delete(_: AbortSignal, tableName: string): Promise<void> {
    const deleteTableStatement = this.db.prepare(`
      DELETE FROM tables
      WHERE name = ?
    `);

    try {
      this.db.exec(`BEGIN`);
      deleteTableStatement.run(tableName);
      this.db.exec(`DROP TABLE IF EXISTS ${SqliteTableDataNameProvider.getName(tableName)}`);
      this.db.exec(`COMMIT`);
    } catch (e) {
      this.db.exec(`ROLLBACK`);
      throw e;
    }
  }
}

import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableRepository, TableRepositoryError } from './table-repository';
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
      if (isDuplicateTableNameSqliteError(e)) {
        throw new TableRepositoryError('A table name is already in use');
      }
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

  public async delete(_: AbortSignal, tableName: string): Promise<boolean> {
    const deleteTableStatement = this.db.prepare(`
      DELETE FROM tables
      WHERE name = ?
    `);

    try {
      this.db.exec(`BEGIN`);
      const deleted = deleteTableStatement.run(tableName).changes > 0;
      if (deleted) {
        this.db.exec(`DROP TABLE IF EXISTS ${SqliteTableDataNameProvider.getName(tableName)}`);
      }
      this.db.exec(`COMMIT`);
      return deleted;
    } catch (e) {
      this.db.exec(`ROLLBACK`);
      throw e;
    }
  }

  public async tryGetByName(_: AbortSignal, tableName: string): Promise<Table | null> {
    const statement = this.db.prepare(`
      SELECT name, description
      FROM tables
      WHERE name = ?
      LIMIT 1
    `);
    const row = statement.get(tableName) as { name: string; description: string } | undefined;
    return row ? new Table(row.name, row.description) : null;
  }
}

function isDuplicateTableNameSqliteError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ERR_SQLITE_ERROR' &&
    error.message.includes('UNIQUE constraint failed: tables.name')
  );
}

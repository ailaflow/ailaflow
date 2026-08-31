import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableRepository, TableRepositoryError } from './table-repository';
import { Table } from './table';

export class SqliteTableRepository implements TableRepository {
  private readonly modelDb: DatabaseSync;
  private readonly dataDb: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.modelDb = dbs.modelDb;
    this.dataDb = dbs.dataDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.modelDb.exec(`
      CREATE TABLE IF NOT EXISTS tables (
        name TEXT PRIMARY KEY,
        description TEXT NOT NULL
      ) STRICT
    `);
  }

  public async insert(_: AbortSignal, table: Table): Promise<void> {
    const insertTableStatement = this.modelDb.prepare(`
      INSERT INTO tables (name, description)
      VALUES (?, ?)
    `);

    try {
      this.modelDb.exec(`BEGIN`);
      insertTableStatement.run(table.name, table.description);
      this.dataDb.exec(`
        CREATE TABLE ${SqliteTableDataNameProvider.getName(table.name)} (
          pk TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        ) STRICT
      `);
      this.modelDb.exec(`COMMIT`);
    } catch (e) {
      this.modelDb.exec(`ROLLBACK`);
      if (isDuplicateTableNameSqliteError(e)) {
        throw new TableRepositoryError('A table name is already in use');
      }
      throw e;
    }
  }

  public async update(_: AbortSignal, table: Table): Promise<void> {
    const statement = this.modelDb.prepare(`
      UPDATE tables
      SET description = ?
      WHERE name = ?
    `);
    statement.run(table.description, table.name);
  }

  public async delete(_: AbortSignal, tableName: string): Promise<boolean> {
    const deleteTableStatement = this.modelDb.prepare(`
      DELETE FROM tables
      WHERE name = ?
    `);

    try {
      this.modelDb.exec(`BEGIN`);
      const deleted = deleteTableStatement.run(tableName).changes > 0;
      if (deleted) {
        this.dataDb.exec(`DROP TABLE IF EXISTS ${SqliteTableDataNameProvider.getName(tableName)}`);
      }
      this.modelDb.exec(`COMMIT`);
      return deleted;
    } catch (e) {
      this.modelDb.exec(`ROLLBACK`);
      throw e;
    }
  }

  public async tryGetByName(_: AbortSignal, tableName: string): Promise<Table | null> {
    const statement = this.modelDb.prepare(`
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

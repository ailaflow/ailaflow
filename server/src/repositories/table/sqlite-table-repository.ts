import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableRepository, TableRepositoryError } from './table-repository';
import { Table } from './table';
import { Transaction } from '../../core/transaction';

export class SqliteTableRepository implements TableRepository {
  private readonly modelDb: SqliteDatabase;
  private readonly dataDb: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.modelDb = dbs.modelDb;
    this.dataDb = dbs.dataDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.modelDb.setup(1, 'tables', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE tables (
            name TEXT PRIMARY KEY,
            description TEXT NOT NULL
          ) STRICT
        `);
      }
    });
  }

  public async insert(_: AbortSignal, table: Table, transaction?: Transaction): Promise<void> {
    try {
      await this.modelDb.write(async modelDb => {
        const insertTableStatement = modelDb.prepare(`
          INSERT INTO tables (name, description)
          VALUES (?, ?)
        `);
        insertTableStatement.run(table.name, table.description);
        await this.dataDb.write(dataDb => {
          dataDb.exec(`
            CREATE TABLE ${SqliteTableDataNameProvider.getName(table.name)} (
              _id TEXT PRIMARY KEY,
              _updatedAt INTEGER NOT NULL
            ) STRICT
          `);
        });
      }, transaction);
    } catch (e) {
      if (isDuplicateTableNameSqliteError(e)) {
        throw new TableRepositoryError('A table name is already in use');
      }
      throw e;
    }
  }

  public async update(_: AbortSignal, table: Table, transaction?: Transaction): Promise<void> {
    await this.modelDb.write(db => {
      const statement = db.prepare(`
        UPDATE tables
        SET description = ?
        WHERE name = ?
      `);
      statement.run(table.description, table.name);
    }, transaction);
  }

  public async delete(_: AbortSignal, tableName: string, transaction?: Transaction): Promise<boolean> {
    const deleted = await this.modelDb.write(async modelDb => {
      const deleteTableStatement = modelDb.prepare(`
          DELETE FROM tables
          WHERE name = ?
        `);
      const result = deleteTableStatement.run(tableName).changes > 0;
      if (result) {
        await this.dataDb.write(dataDb => {
          dataDb.exec(`DROP TABLE IF EXISTS ${SqliteTableDataNameProvider.getName(tableName)}`);
        });
      }
      return result;
    }, transaction);
    return deleted;
  }

  public async tryGetByName(_: AbortSignal, tableName: string): Promise<Table | null> {
    return this.modelDb.read(db => {
      const statement = db.prepare(`
        SELECT name, description
        FROM tables
        WHERE name = ?
        LIMIT 1
      `);
      const row = statement.get(tableName) as { name: string; description: string } | undefined;
      return row ? new Table(row.name, row.description) : null;
    });
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

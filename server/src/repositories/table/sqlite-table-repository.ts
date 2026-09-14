import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableSchemaManager } from './table-schema-manager';
import { TableRepository, TableRepositoryError } from './table-repository';
import { Table } from './table';
import { AsyncMutex } from '../../core/async-mutex';
import { SqliteTransaction } from '../../core/sqlite-transaction';
import { Transaction } from '../../core/transaction';

export class SqliteTableRepository implements TableRepository {
  private readonly modelDb: DatabaseSync;
  private readonly dataDb: DatabaseSync;
  private readonly modelDbMutex: AsyncMutex;
  private readonly dataDbMutex: AsyncMutex;

  public constructor(
    dbs: SqliteDatabases,
    private readonly tableSchemaManager: Pick<TableSchemaManager, 'invalidate'>
  ) {
    this.modelDb = dbs.modelDb;
    this.dataDb = dbs.dataDb;
    this.modelDbMutex = dbs.modelDbMutex;
    this.dataDbMutex = dbs.dataDbMutex;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.modelDb.exec(`
      CREATE TABLE IF NOT EXISTS tables (
        name TEXT PRIMARY KEY,
        description TEXT NOT NULL
      ) STRICT
    `);
  }

  public async insert(_: AbortSignal, table: Table, transaction?: Transaction): Promise<void> {
    const t = await SqliteTransaction.begin(this.modelDb, this.modelDbMutex, transaction);
    try {
      const insertTableStatement = this.modelDb.prepare(`
        INSERT INTO tables (name, description)
        VALUES (?, ?)
      `);
      insertTableStatement.run(table.name, table.description);
      await this.writeDataDb(() => {
        this.dataDb.exec(`
          CREATE TABLE ${SqliteTableDataNameProvider.getName(table.name)} (
            _id TEXT PRIMARY KEY,
            _updatedAt INTEGER NOT NULL
          ) STRICT
        `);
      });
      await t.commit();
      this.tableSchemaManager.invalidate(table.name);
    } catch (e) {
      await t.rollback();
      if (isDuplicateTableNameSqliteError(e)) {
        throw new TableRepositoryError('A table name is already in use');
      }
      throw e;
    }
  }

  public async update(_: AbortSignal, table: Table, transaction?: Transaction): Promise<void> {
    const t = await SqliteTransaction.begin(this.modelDb, this.modelDbMutex, transaction);
    try {
      const statement = this.modelDb.prepare(`
        UPDATE tables
        SET description = ?
        WHERE name = ?
      `);
      statement.run(table.description, table.name);
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  public async delete(_: AbortSignal, tableName: string, transaction?: Transaction): Promise<boolean> {
    const t = await SqliteTransaction.begin(this.modelDb, this.modelDbMutex, transaction);
    try {
      const deleteTableStatement = this.modelDb.prepare(`
        DELETE FROM tables
        WHERE name = ?
      `);
      const deleted = deleteTableStatement.run(tableName).changes > 0;
      if (deleted) {
        await this.writeDataDb(() => {
          this.dataDb.exec(`DROP TABLE IF EXISTS ${SqliteTableDataNameProvider.getName(tableName)}`);
        });
        this.tableSchemaManager.invalidate(tableName);
      }
      await t.commit();
      return deleted;
    } catch (e) {
      await t.rollback();
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

  private async writeDataDb(write: () => void): Promise<void> {
    const release = await this.dataDbMutex.acquire();
    try {
      write();
    } finally {
      release();
    }
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

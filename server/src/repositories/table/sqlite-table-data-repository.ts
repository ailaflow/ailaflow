import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableDataRepository, TableDataRepositoryError } from './table-data-repository';
import { TableData } from './table-data';

export class SqliteTableDataRepository implements TableDataRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async tryGet(_: AbortSignal, tableName: string, pk: string): Promise<TableData | null> {
    try {
      const statement = this.db.prepare(`
        SELECT pk, data, updatedAt
        FROM ${SqliteTableDataNameProvider.getName(tableName)}
        WHERE pk = ?
        LIMIT 1
      `);
      const row = statement.get(pk) as { pk: string; data: string; updatedAt: number } | undefined;
      return row ? new TableData(tableName, row.pk, JSON.parse(row.data) as unknown, row.updatedAt) : null;
    } catch (e) {
      throw mapSqliteError(e, tableName);
    }
  }

  public async upsert(_: AbortSignal, tableData: TableData): Promise<void> {
    try {
      const statement = this.db.prepare(`
        INSERT INTO ${SqliteTableDataNameProvider.getName(tableData.tableName)} (pk, data, updatedAt)
        VALUES (?, ?, ?)
        ON CONFLICT(pk) DO UPDATE SET
          data = excluded.data,
          updatedAt = excluded.updatedAt
      `);
      statement.run(tableData.pk, JSON.stringify(tableData.data), tableData.updatedAt);
    } catch (e) {
      throw mapSqliteError(e, tableData.tableName);
    }
  }

  public async delete(_: AbortSignal, tableName: string, pk: string): Promise<void> {
    try {
      const statement = this.db.prepare(`
        DELETE FROM ${SqliteTableDataNameProvider.getName(tableName)}
        WHERE pk = ?
      `);
      statement.run(pk);
    } catch (e) {
      throw mapSqliteError(e, tableName);
    }
  }
}

function mapSqliteError(error: unknown, tableName: string): unknown {
  if (error instanceof Error && 'code' in error && error.code === 'ERR_SQLITE_ERROR' && error.message.includes('no such table')) {
    return new TableDataRepositoryError(`Table "${tableName}" does not exist`);
  }
  return error;
}

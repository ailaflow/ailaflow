import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableDataRepository } from './table-data-repository';
import { TableData } from './table-data';

export class SqliteTableDataRepository implements TableDataRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async upsert(_: AbortSignal, tableData: TableData): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO ${SqliteTableDataNameProvider.getName(tableData.tableName)} (pk, data, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(pk) DO UPDATE SET
        data = excluded.data,
        updatedAt = excluded.updatedAt
    `);
    statement.run(tableData.pk, JSON.stringify(tableData.data), tableData.updatedAt);
  }

  public async delete(_: AbortSignal, tableName: string, pk: string): Promise<void> {
    const statement = this.db.prepare(`
      DELETE FROM ${SqliteTableDataNameProvider.getName(tableName)}
      WHERE pk = ?
    `);
    statement.run(pk);
  }
}

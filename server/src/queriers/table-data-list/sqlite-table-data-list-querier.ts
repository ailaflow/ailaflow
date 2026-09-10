import { GetTableDataResponse, TableDataDto } from '@ailaflow/model';
import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from '../../repositories/table/sqlite-table-data-name-provider';
import { TableDataListQuerier } from './table-data-list-querier';

export class SqliteTableDataListQuerier implements TableDataListQuerier {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async query(_: AbortSignal, tableName: string, page: number, pageSize: number): Promise<GetTableDataResponse> {
    const dataTableName = SqliteTableDataNameProvider.getName(tableName);
    const { totalCount } = this.db.prepare(`SELECT COUNT(*) AS totalCount FROM ${dataTableName}`).get() as {
      totalCount: number;
    };
    const statement = this.db.prepare(`
      SELECT pk, data, updatedAt
      FROM ${dataTableName}
      ORDER BY pk
      LIMIT ? OFFSET ?
    `);
    const rows = statement.all(pageSize, (page - 1) * pageSize) as unknown as TableDataRow[];

    return {
      rows: mapRows(rows),
      totalCount,
      page,
      pageSize
    };
  }
}

interface TableDataRow {
  pk: string;
  data: string;
  updatedAt: number;
}

function mapRows(rows: TableDataRow[]): TableDataDto[] {
  return rows.map(row => ({
    pk: row.pk,
    data: JSON.parse(row.data) as unknown,
    updatedAt: row.updatedAt
  }));
}

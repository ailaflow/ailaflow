import { GetTableDataResponse, TableColumnTypePolicy, TableRow } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from '../../repositories/table/sqlite-table-data-name-provider';
import { TableDataRepositoryError } from '../../repositories/table/table-data-repository';
import { TableRowSqliteCodec } from '../../repositories/table/table-row-sqlite-codec';
import { TableSchemaManager } from '../../repositories/table/table-schema-manager';
import { TableSchema } from '../../repositories/table/table-schema';
import { TableDataListQuerier } from './table-data-list-querier';

export class SqliteTableDataListQuerier implements TableDataListQuerier {
  private readonly db: SqliteDatabase;

  public constructor(
    dbs: SqliteDatabases,
    private readonly tableSchemaManager: TableSchemaManager
  ) {
    this.db = dbs.dataDb;
  }

  public async query(
    abortSignal: AbortSignal,
    tableName: string,
    page: number,
    pageSize: number,
    orderByColumn: string,
    ascending: boolean
  ): Promise<GetTableDataResponse> {
    const dataTableName = SqliteTableDataNameProvider.getName(tableName);
    try {
      const schema = await this.tableSchemaManager.get(abortSignal, tableName);
      const orderBy = resolveOrderBy(schema, orderByColumn);
      const direction = ascending ? 'ASC' : 'DESC';
      return this.db.read(db => {
        const { totalCount } = db.prepare(`SELECT COUNT(*) AS totalCount FROM ${dataTableName}`).get() as {
          totalCount: number;
        };
        const statement = db.prepare(`
        SELECT *
        FROM ${dataTableName}
        ORDER BY ${orderBy} IS NULL, ${orderBy} ${direction}, _id ASC
        LIMIT ? OFFSET ?
      `);
        const rows = statement.all(pageSize, (page - 1) * pageSize) as unknown as TableDataRow[];

        return {
          rows: mapRows(schema, rows),
          totalCount,
          page,
          pageSize,
          hasMore: page * pageSize < totalCount
        };
      });
    } catch (error) {
      throw mapSqliteError(error, tableName);
    }
  }
}

type TableDataRow = Record<string, unknown>;

function mapRows(schema: TableSchema, rows: TableDataRow[]): TableRow[] {
  return rows.map(row => TableRowSqliteCodec.decode(schema, row));
}

function resolveOrderBy(schema: TableSchema, orderBy: string): string {
  if (orderBy === '_id' || orderBy === '_updatedAt') {
    return orderBy;
  }

  const columnType = schema.getColumnType(orderBy);
  if (columnType === undefined) {
    throw new TableDataRepositoryError(`Column "${orderBy}" does not exist in table "${schema.tableName}"`);
  }
  if (!TableColumnTypePolicy.isSortable(columnType)) {
    throw new TableDataRepositoryError(`Column "${orderBy}" cannot be sorted because it contains JSON values`);
  }
  return `"${orderBy}"`;
}

function mapSqliteError(error: unknown, tableName: string): unknown {
  if (error instanceof Error && 'code' in error && error.code === 'ERR_SQLITE_ERROR' && error.message.includes('no such table')) {
    return new TableDataRepositoryError(`Table "${tableName}" does not exist`);
  }
  return error;
}

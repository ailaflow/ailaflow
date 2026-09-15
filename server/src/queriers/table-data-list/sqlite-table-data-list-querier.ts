import { GetTableDataResponse, TableColumnResolver, TableColumnType, TableColumnTypePolicy, TableRow } from '@ailaflow/shared';
import { SQLInputValue } from 'node:sqlite';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from '../../repositories/table/sqlite-table-data-name-provider';
import { TableDataRepositoryError } from '../../repositories/table/table-data-repository';
import { TableRowSqliteCodec } from '../../repositories/table/table-row-sqlite-codec';
import { TableSchema } from '../../repositories/table/table-schema';
import {
  TableDataListQuerier,
  TableDataPageQuery,
  TableDataWhere,
  TableDataWhereCondition,
  TableDataWhereValue
} from './table-data-list-querier';

export class SqliteTableDataListQuerier implements TableDataListQuerier {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async query(_: AbortSignal, schema: TableSchema, query: TableDataPageQuery): Promise<GetTableDataResponse> {
    const { page, pageSize, orderBy: orderByColumn, ascending, where = {} } = query;
    const tableName = schema.tableName;
    const dataTableName = SqliteTableDataNameProvider.getName(tableName);
    try {
      const orderBy = tryResolveColumn(schema, orderByColumn);
      if (orderBy === null) {
        return createEmptyResponse(page, pageSize);
      }

      const resolvedWhere = tryResolveWhere(schema, where);
      if (resolvedWhere === null) {
        return createEmptyResponse(page, pageSize);
      }
      if (!TableColumnTypePolicy.isSortable(orderBy.type)) {
        throw new TableDataRepositoryError(`Column "${orderByColumn}" cannot be sorted because it contains JSON values`);
      }

      const whereSql = resolvedWhere.conditions.length > 0 ? `WHERE ${resolvedWhere.conditions.join(' AND ')}` : '';
      const direction = ascending ? 'ASC' : 'DESC';
      return this.db.read(db => {
        const statement = db.prepare(`
        SELECT *
        FROM ${dataTableName}
        ${whereSql}
        ORDER BY ${orderBy.sqlName} IS NULL, ${orderBy.sqlName} ${direction}, _id ASC
        LIMIT ? OFFSET ?
      `);
        const rows = statement.all(...resolvedWhere.values, pageSize + 1, (page - 1) * pageSize) as unknown as TableDataRow[];
        const hasMore = rows.length > pageSize;

        return {
          rows: mapRows(schema, rows.slice(0, pageSize)),
          page,
          pageSize,
          hasMore
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

interface ResolvedColumn {
  sqlName: string;
  type: TableColumnType;
}

interface ResolvedWhere {
  conditions: string[];
  values: SQLInputValue[];
}

const sqlOperators = {
  $eq: '=',
  $neq: '<>',
  $lt: '<',
  $gt: '>',
  $lte: '<=',
  $gte: '>='
} as const;

function tryResolveColumn(schema: TableSchema, columnName: string): ResolvedColumn | null {
  if (columnName === '_id') {
    return { sqlName: '_id', type: TableColumnType.STRING };
  }
  if (columnName === '_updatedAt') {
    return { sqlName: '_updatedAt', type: TableColumnType.NUMBER };
  }

  const columnType = schema.getColumnType(columnName);
  if (columnType === undefined) {
    return null;
  }
  return { sqlName: `"${columnName}"`, type: columnType };
}

function tryResolveWhere(schema: TableSchema, where: TableDataWhere): ResolvedWhere | null {
  const resolvedColumns = new Map<string, ResolvedColumn>();
  for (const columnName of Object.keys(where)) {
    const column = tryResolveColumn(schema, columnName);
    if (column === null) {
      return null;
    }
    resolvedColumns.set(columnName, column);
  }

  const conditions: string[] = [];
  const values: SQLInputValue[] = [];
  for (const [columnName, condition] of Object.entries(where)) {
    const column = resolvedColumns.get(columnName);
    if (column === undefined) {
      throw new Error(`Column "${columnName}" was not resolved`);
    }
    if (column.type === TableColumnType.JSON) {
      throw new TableDataRepositoryError(`Column "${columnName}" cannot be filtered because it contains JSON values`);
    }
    appendCondition(schema, columnName, column, condition, conditions, values);
  }

  return { conditions, values };
}

function appendCondition(
  schema: TableSchema,
  columnName: string,
  column: ResolvedColumn,
  condition: Readonly<TableDataWhereCondition>,
  conditions: string[],
  values: SQLInputValue[]
): void {
  const operators = Object.entries(condition) as [keyof TableDataWhereCondition, TableDataWhereValue][];
  if (operators.length === 0) {
    throw new TableDataRepositoryError(`Where condition for column "${columnName}" must contain at least one operator`);
  }

  for (const [operator, value] of operators) {
    validateValueType(schema, columnName, column.type, value);
    conditions.push(`${column.sqlName} ${sqlOperators[operator]} ?`);
    values.push(TableRowSqliteCodec.encodeValue(column.type, value));
  }
}

function validateValueType(schema: TableSchema, columnName: string, expectedType: TableColumnType, value: TableDataWhereValue): void {
  const receivedType = TableColumnResolver.resolveValueType(columnName, value);
  if (receivedType !== expectedType) {
    throw new TableDataRepositoryError(
      `Column "${columnName}" in table "${schema.tableName}" expects type ${TableColumnType[expectedType]} but received ${TableColumnType[receivedType]}`
    );
  }
}

function createEmptyResponse(page: number, pageSize: number): GetTableDataResponse {
  return {
    rows: [],
    page,
    pageSize,
    hasMore: false
  };
}

function mapSqliteError(error: unknown, tableName: string): unknown {
  if (error instanceof Error && 'code' in error && error.code === 'ERR_SQLITE_ERROR' && error.message.includes('no such table')) {
    return new TableDataRepositoryError(`Table #${tableName} does not exist`);
  }
  return error;
}

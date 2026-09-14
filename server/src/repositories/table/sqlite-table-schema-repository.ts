import { TableColumn, TableColumnNameValidator, TableColumnType, TableSchemaError } from '@ailaflow/shared';
import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableDataRepositoryError } from './table-data-repository';
import { TableSchemaConcurrencyError, TableSchemaRepository } from './table-schema-repository';
import { TableSchema } from './table-schema';
import { AsyncMutex } from '../../core/async-mutex';
import { SqliteTransaction } from '../../core/sqlite-transaction';
import { Transaction } from '../../core/transaction';

export class SqliteTableSchemaRepository implements TableSchemaRepository {
  private readonly db: DatabaseSync;
  private readonly dbMutex: AsyncMutex;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
    this.dbMutex = dbs.dataDbMutex;
  }

  public async get(_: AbortSignal, tableName: string): Promise<TableSchema> {
    const dataTableName = SqliteTableDataNameProvider.getName(tableName);
    const rows = this.db.prepare(`PRAGMA table_info(${dataTableName})`).all() as unknown as SqliteTableColumnRow[];
    if (rows.length === 0) {
      throw new TableDataRepositoryError(`Table "${tableName}" does not exist`);
    }

    const columns = rows.filter(row => !row.name.startsWith('_')).map(mapColumn);
    return new TableSchema(tableName, columns);
  }

  public async save(abortSignal: AbortSignal, schema: TableSchema, transaction?: Transaction): Promise<TableSchema> {
    if (schema.newColumns.length === 0) {
      return schema.asPersisted();
    }

    const dataTableName = SqliteTableDataNameProvider.getName(schema.tableName);
    const t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
    try {
      for (const column of schema.newColumns) {
        const validationError = TableColumnNameValidator.validate(column.name);
        if (validationError) {
          throw new TableSchemaError(validationError);
        }
        const columnName = `"${column.name}"`;
        const columnType = mapColumnTypeToSqlite(column.type);
        this.db.exec(`ALTER TABLE ${dataTableName} ADD COLUMN ${columnName} ${columnType}`);
      }
      await t.commit();
    } catch (error) {
      await t.rollback();
      if (isDuplicateColumnError(error)) {
        throw new TableSchemaConcurrencyError();
      }
      throw mapSqliteError(error, schema.tableName);
    }
    return this.get(abortSignal, schema.tableName);
  }
}

interface SqliteTableColumnRow {
  name: string;
  type: string;
}

function mapColumn(row: SqliteTableColumnRow): TableColumn {
  return {
    name: row.name,
    type: mapSqliteTypeToColumnType(row.type, row.name)
  };
}

function mapSqliteTypeToColumnType(type: string, columnName: string): TableColumnType {
  switch (type) {
    case 'TEXT':
      return TableColumnType.STRING;
    case 'REAL':
      return TableColumnType.NUMBER;
    case 'INTEGER':
      return TableColumnType.BOOLEAN;
    case 'BLOB':
      return TableColumnType.JSON;
    default:
      throw new Error(`Column "${columnName}" has unsupported SQLite type "${type}"`);
  }
}

function mapColumnTypeToSqlite(type: TableColumnType): string {
  switch (type) {
    case TableColumnType.STRING:
      return 'TEXT';
    case TableColumnType.NUMBER:
      return 'REAL';
    case TableColumnType.BOOLEAN:
      return 'INTEGER';
    case TableColumnType.JSON:
      return 'BLOB';
  }
}

function isDuplicateColumnError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ERR_SQLITE_ERROR' && error.message.includes('duplicate column name');
}

function mapSqliteError(error: unknown, tableName: string): unknown {
  if (error instanceof Error && 'code' in error && error.code === 'ERR_SQLITE_ERROR' && error.message.includes('no such table')) {
    return new TableDataRepositoryError(`Table "${tableName}" does not exist`);
  }
  return error;
}

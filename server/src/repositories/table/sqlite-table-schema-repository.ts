import { TableColumn, TableColumnNameValidator, TableColumnType, TableSchemaError } from '@ailaflow/shared';
import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableDataRepositoryError } from './table-data-repository';
import { TableSchemaConcurrencyError, TableSchemaRepository } from './table-schema-repository';
import { TableSchema } from './table-schema';
import { Transaction } from '../../core/transaction';

export class SqliteTableSchemaRepository implements TableSchemaRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async get(_: AbortSignal, tableName: string): Promise<TableSchema> {
    return this.db.read(db => this.getFromDb(db, tableName));
  }

  public async tryGet(_: AbortSignal, tableName: string): Promise<TableSchema | null> {
    return this.db.read(db => this.tryGetFromDb(db, tableName));
  }

  public async save(_: AbortSignal, schema: TableSchema, transaction?: Transaction): Promise<TableSchema> {
    if (schema.newColumns.length === 0) {
      return schema.asPersisted();
    }

    try {
      return await this.db.write(db => {
        const dataTableName = SqliteTableDataNameProvider.getName(schema.tableName);
        for (const column of schema.newColumns) {
          const validationError = TableColumnNameValidator.validate(column.name);
          if (validationError) {
            throw new TableSchemaError(validationError);
          }
          const columnName = `"${column.name}"`;
          const columnType = mapColumnTypeToSqlite(column.type);
          db.exec(`ALTER TABLE ${dataTableName} ADD COLUMN ${columnName} ${columnType}`);
        }
        return this.getFromDb(db, schema.tableName);
      }, transaction);
    } catch (error) {
      if (isDuplicateColumnError(error)) {
        throw new TableSchemaConcurrencyError();
      }
      throw mapSqliteError(error, schema.tableName);
    }
  }

  private getFromDb(db: DatabaseSync, tableName: string): TableSchema {
    const schema = this.tryGetFromDb(db, tableName);
    if (schema === null) {
      throw new TableDataRepositoryError(`Table "${tableName}" does not exist`);
    }
    return schema;
  }

  private tryGetFromDb(db: DatabaseSync, tableName: string): TableSchema | null {
    const dataTableName = SqliteTableDataNameProvider.getName(tableName);
    const rows = db.prepare(`PRAGMA table_info(${dataTableName})`).all() as unknown as SqliteTableColumnRow[];
    if (rows.length === 0) {
      return null;
    }

    const columns = rows.filter(row => !row.name.startsWith('_')).map(mapColumn);
    return new TableSchema(tableName, columns);
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

import { TableRow } from '@ailaflow/shared';
import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableRowSqliteCodec } from './table-row-sqlite-codec';
import { TableSchemaManager } from './table-schema-manager';
import { TableDataRepository, TableDataRepositoryError } from './table-data-repository';

export class SqliteTableDataRepository implements TableDataRepository {
  private readonly db: DatabaseSync;

  public constructor(
    dbs: SqliteDatabases,
    private readonly tableSchemaManager: TableSchemaManager
  ) {
    this.db = dbs.dataDb;
  }

  public async tryGet(abortSignal: AbortSignal, tableName: string, _id: string): Promise<TableRow | null> {
    try {
      const schema = await this.tableSchemaManager.get(abortSignal, tableName);
      const statement = this.db.prepare(`
        SELECT *
        FROM ${SqliteTableDataNameProvider.getName(tableName)}
        WHERE _id = ?
        LIMIT 1
      `);
      const values = statement.get(_id) as Record<string, unknown> | undefined;
      return values ? TableRowSqliteCodec.decode(schema, values) : null;
    } catch (e) {
      throw mapSqliteError(e, tableName);
    }
  }

  public async upsert(abortSignal: AbortSignal, tableName: string, row: Record<string, unknown> & { _id: string }): Promise<void> {
    try {
      const schema = await this.tableSchemaManager.ensureCompatible(abortSignal, tableName, row);
      const userColumnNames = schema.columns.map(column => `"${column.name}"`);
      const columnNames = ['_id', '_updatedAt', ...userColumnNames];
      const updatedColumnNames = ['_updatedAt', ...userColumnNames];
      const statement = this.db.prepare(`
        INSERT INTO ${SqliteTableDataNameProvider.getName(tableName)} (${columnNames.join(', ')})
        VALUES (${columnNames.map(() => '?').join(', ')})
        ON CONFLICT(_id) DO UPDATE SET
          ${updatedColumnNames.map(columnName => `${columnName} = excluded.${columnName}`).join(', ')}
      `);
      statement.run(row._id, Date.now(), ...TableRowSqliteCodec.encode(schema, row));
    } catch (e) {
      throw mapSqliteError(e, tableName);
    }
  }

  public async delete(_: AbortSignal, tableName: string, _id: string): Promise<void> {
    try {
      const statement = this.db.prepare(`
        DELETE FROM ${SqliteTableDataNameProvider.getName(tableName)}
        WHERE _id = ?
      `);
      statement.run(_id);
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

import { TableRow } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableRowSqliteCodec } from './table-row-sqlite-codec';
import { TableDataRepository, TableDataRepositoryError } from './table-data-repository';
import { Transaction } from '../../core/transaction';
import { TableSchema } from './table-schema';

export class SqliteTableDataRepository implements TableDataRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async tryGet(_: AbortSignal, schema: TableSchema, _id: string): Promise<TableRow | null> {
    try {
      return await this.db.read(db => {
        const statement = db.prepare(`
          SELECT *
          FROM ${SqliteTableDataNameProvider.getName(schema.tableName)}
          WHERE _id = ?
          LIMIT 1
        `);
        const values = statement.get(_id) as Record<string, unknown> | undefined;
        return values ? TableRowSqliteCodec.decode(schema, values) : null;
      });
    } catch (e) {
      throw mapSqliteError(e, schema.tableName);
    }
  }

  public async upsert(
    _: AbortSignal,
    schema: TableSchema,
    row: Record<string, unknown> & { _id: string },
    transaction?: Transaction
  ): Promise<void> {
    try {
      await this.db.write(db => {
        const userColumnNames = schema.columns.map(column => `"${column.name}"`);
        const columnNames = ['_id', '_updatedAt', ...userColumnNames];
        const updatedColumnNames = ['_updatedAt', ...userColumnNames];
        const statement = db.prepare(`
          INSERT INTO ${SqliteTableDataNameProvider.getName(schema.tableName)} (${columnNames.join(', ')})
          VALUES (${columnNames.map(() => '?').join(', ')})
          ON CONFLICT(_id) DO UPDATE SET
            ${updatedColumnNames.map(columnName => `${columnName} = excluded.${columnName}`).join(', ')}
        `);
        statement.run(row._id, Date.now(), ...TableRowSqliteCodec.encode(schema, row));
      }, transaction);
    } catch (e) {
      throw mapSqliteError(e, schema.tableName);
    }
  }

  public async delete(_: AbortSignal, tableName: string, _id: string, transaction?: Transaction): Promise<void> {
    try {
      await this.db.write(db => {
        const statement = db.prepare(`
          DELETE FROM ${SqliteTableDataNameProvider.getName(tableName)}
          WHERE _id = ?
        `);
        statement.run(_id);
      }, transaction);
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

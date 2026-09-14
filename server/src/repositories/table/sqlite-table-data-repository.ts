import { TableRow } from '@ailaflow/shared';
import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataNameProvider } from './sqlite-table-data-name-provider';
import { TableRowSqliteCodec } from './table-row-sqlite-codec';
import { TableSchemaManager } from './table-schema-manager';
import { TableDataRepository, TableDataRepositoryError } from './table-data-repository';
import { AsyncMutex } from '../../core/async-mutex';
import { SqliteTransaction } from '../../core/sqlite-transaction';
import { Transaction } from '../../core/transaction';

export class SqliteTableDataRepository implements TableDataRepository {
  private readonly db: DatabaseSync;
  private readonly dbMutex: AsyncMutex;

  public constructor(
    dbs: SqliteDatabases,
    private readonly tableSchemaManager: TableSchemaManager
  ) {
    this.db = dbs.dataDb;
    this.dbMutex = dbs.dataDbMutex;
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

  public async upsert(
    abortSignal: AbortSignal,
    tableName: string,
    row: Record<string, unknown> & { _id: string },
    transaction?: Transaction
  ): Promise<void> {
    let t: Transaction | null = null;
    try {
      const schema = await this.tableSchemaManager.ensureCompatible(abortSignal, tableName, row, transaction);
      t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
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
      await t.commit();
    } catch (e) {
      if (t) {
        await t.rollback();
      }
      throw mapSqliteError(e, tableName);
    }
  }

  public async delete(_: AbortSignal, tableName: string, _id: string, transaction?: Transaction): Promise<void> {
    const t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
    try {
      const statement = this.db.prepare(`
        DELETE FROM ${SqliteTableDataNameProvider.getName(tableName)}
        WHERE _id = ?
      `);
      statement.run(_id);
      await t.commit();
    } catch (e) {
      await t.rollback();
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

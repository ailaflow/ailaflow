import { GetTablesResponse, TableLiteDto } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { TableListQuerier } from './table-list-querier';

export class SqliteTableListQuerier implements TableListQuerier {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal, page: number, pageSize: number): Promise<GetTablesResponse> {
    return this.db.read(db => {
      const { totalCount } = db.prepare(`SELECT COUNT(*) AS totalCount FROM tables`).get() as { totalCount: number };
      const statement = db.prepare(`
        SELECT name, description
        FROM tables
        ORDER BY name
        LIMIT ? OFFSET ?
      `);
      const rows = statement.all(pageSize, (page - 1) * pageSize) as unknown as TableRow[];

      return {
        tables: mapRows(rows),
        totalCount,
        page,
        pageSize
      };
    });
  }
}

interface TableRow {
  name: string;
  description: string;
}

function mapRows(rows: TableRow[]): TableLiteDto[] {
  return rows.map(row => ({
    name: row.name,
    description: row.description
  }));
}

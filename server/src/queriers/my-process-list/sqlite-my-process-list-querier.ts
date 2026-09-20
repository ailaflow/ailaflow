import { GetMyProcessesResponse, MyProcessLiteDto, ProcessDisplay } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteResourceAccessQueryBuilder } from '../../core/sqlite-resource-access-query-builder';
import { MyProcessListQuerier } from './my-process-list-querier';

export class SqliteMyProcessListQuerier implements MyProcessListQuerier {
  private readonly db: SqliteDatabase;

  public constructor(
    dbs: SqliteDatabases,
    private readonly resourceAccessQueryBuilder = new SqliteResourceAccessQueryBuilder()
  ) {
    this.db = dbs.modelDb;
  }

  public async query(
    _: AbortSignal,
    userName: string,
    page: number,
    pageSize: number,
    displayAtLeast: ProcessDisplay
  ): Promise<GetMyProcessesResponse> {
    return this.db.read(db => {
      const countStatement = db.prepare(`
      WITH ${this.resourceAccessQueryBuilder.buildAccessibleResourcesCte()}
      SELECT COUNT(*) AS totalCount
      FROM processes p
      JOIN accessible_resources ar
        ON ar.resource_id = 'process:' || p.name
      WHERE p.display <= ?
    `);
      const { totalCount } = countStatement.get(userName, displayAtLeast) as { totalCount: number };

      const statement = db.prepare(`
      WITH ${this.resourceAccessQueryBuilder.buildAccessibleResourcesCte()}
      SELECT p.name, p.description
      FROM processes p
      JOIN accessible_resources ar
        ON ar.resource_id = 'process:' || p.name
      WHERE p.display <= ?
      ORDER BY p.name
      LIMIT ? OFFSET ?
    `);

      return {
        processes: mapRows(statement.all(userName, displayAtLeast, pageSize, (page - 1) * pageSize) as unknown as MyProcessRow[]),
        totalCount,
        page,
        pageSize
      };
    });
  }
}

interface MyProcessRow {
  name: string;
  description: string;
}

function mapRows(rows: MyProcessRow[]): MyProcessLiteDto[] {
  return rows.map(row => ({
    name: row.name,
    description: row.description
  }));
}

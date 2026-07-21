import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteResourceAccessQueryBuilder } from '../../core/sqlite-resource-access-query-builder';
import { MyProcessAccessQuerier } from './my-process-access-querier';

export class SqliteMyProcessAccessQuerier implements MyProcessAccessQuerier {
  private readonly db: DatabaseSync;

  public constructor(
    dbs: SqliteDatabases,
    private readonly resourceAccessQueryBuilder = new SqliteResourceAccessQueryBuilder()
  ) {
    this.db = dbs.modelDb;
  }

  public async hasAccess(_: AbortSignal, userName: string, processName: string): Promise<boolean> {
    const statement = this.db.prepare(`
      WITH ${this.resourceAccessQueryBuilder.buildAccessibleResourcesCte()}
      SELECT 1
      FROM processes p
      JOIN accessible_resources ar
        ON ar.resource_id = 'process:' || p.name
      WHERE p.name = ?
      LIMIT 1
    `);
    return Boolean(statement.get(userName, processName));
  }
}

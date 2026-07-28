import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteResourceAccessQueryBuilder } from '../../core/sqlite-resource-access-query-builder';
import { ResourceAccessUserQuerier } from './resource-access-user-querier';

export class SqliteResourceAccessUserQuerier implements ResourceAccessUserQuerier {
  private readonly db: DatabaseSync;

  public constructor(
    dbs: SqliteDatabases,
    private readonly resourceAccessQueryBuilder = new SqliteResourceAccessQueryBuilder()
  ) {
    this.db = dbs.modelDb;
  }

  public async queryAssignedUserNames(_: AbortSignal, resourceId: string): Promise<string[]> {
    const statement = this.db.prepare(`
      WITH ${this.resourceAccessQueryBuilder.buildAccessibleUsersCte()}
      SELECT user_name
      FROM accessible_users
      ORDER BY user_name
    `);
    const rows = statement.all(resourceId) as { user_name: string }[];
    return rows.map(row => row.user_name);
  }
}

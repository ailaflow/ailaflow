import { DatabaseSync } from 'node:sqlite';
import { GetUsersResponse } from '@ailaflow/shared';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { UserListQuerier } from './user-list-querier';

export class SqliteUserListQuerier implements UserListQuerier {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal, page: number, pageSize: number, search?: string): Promise<GetUsersResponse> {
    const searchTerm = search ?? '';
    const { totalCount } = this.db
      .prepare(
        `
        SELECT COUNT(*) AS totalCount
        FROM users
        WHERE instr(name, ?) > 0
      `
      )
      .get(searchTerm) as { totalCount: number };

    const statement = this.db.prepare(`
      SELECT name, isAdmin
      FROM users
      WHERE instr(name, ?) > 0
      ORDER BY name
      LIMIT ? OFFSET ?
    `);
    const rows = statement.all(searchTerm, pageSize, (page - 1) * pageSize) as {
      name: string;
      isAdmin: number;
    }[];
    return {
      users: rows.map(row => ({
        name: row.name,
        isAdmin: row.isAdmin === 1
      })),
      totalCount,
      page,
      pageSize
    };
  }
}

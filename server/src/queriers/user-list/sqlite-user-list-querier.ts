import { GetUsersResponse } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { UserListQuerier } from './user-list-querier';

export class SqliteUserListQuerier implements UserListQuerier {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal, page: number, pageSize: number, search?: string): Promise<GetUsersResponse> {
    return this.db.read(db => {
      const searchTerm = search ?? '';
      const { totalCount } = db
        .prepare(
          `
        SELECT COUNT(*) AS totalCount
        FROM users
        WHERE instr(name, ?) > 0
      `
        )
        .get(searchTerm) as { totalCount: number };

      const statement = db.prepare(`
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
    });
  }
}

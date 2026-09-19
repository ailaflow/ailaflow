import { GetUsersResponse } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { UserListQuerier } from './user-list-querier';

export class SqliteUserListQuerier implements UserListQuerier {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal, page: number, pageSize: number, onlyActive: boolean, search?: string): Promise<GetUsersResponse> {
    return this.db.read(db => {
      const searchTerm = search ?? '';
      const activeFilter = onlyActive ? 1 : 0;
      const { totalCount } = db
        .prepare(
          `
        SELECT COUNT(*) AS totalCount
        FROM users
        WHERE instr(name, ?) > 0
          AND (? = 0 OR isActive = 1)
      `
        )
        .get(searchTerm, activeFilter) as { totalCount: number };

      const statement = db.prepare(`
      SELECT name, isActive, isAdmin
      FROM users
      WHERE instr(name, ?) > 0
        AND (? = 0 OR isActive = 1)
      ORDER BY name
      LIMIT ? OFFSET ?
    `);
      const rows = statement.all(searchTerm, activeFilter, pageSize, (page - 1) * pageSize) as {
        name: string;
        isActive: number;
        isAdmin: number;
      }[];
      return {
        users: rows.map(row => ({
          name: row.name,
          isActive: row.isActive === 1,
          isAdmin: row.isAdmin === 1
        })),
        totalCount,
        page,
        pageSize
      };
    });
  }
}

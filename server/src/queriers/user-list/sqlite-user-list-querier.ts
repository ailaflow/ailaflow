import { DatabaseSync } from 'node:sqlite';
import { UserLiteDto } from '@aila/model';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { UserListQuerier } from './user-list-querier';

export class SqliteUserListQuerier implements UserListQuerier {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.userDb;
  }

  public async query(): Promise<UserLiteDto[]> {
    const statement = this.db.prepare(`
      SELECT name, isAdmin
      FROM users
    `);
    const rows = statement.all() as {
      name: string;
      isAdmin: number;
    }[];
    return rows.map(row => ({
      name: row.name,
      isAdmin: row.isAdmin === 1
    }));
  }
}

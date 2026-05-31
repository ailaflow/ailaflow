import { DatabaseSync } from 'node:sqlite';
import { User, UserRepository } from './user-repository';
import { SqliteDatabases } from '../../core/sqlite-databases';

export class SqliteUserRepository implements UserRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.userDb;
  }

  public async setup() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        name TEXT PRIMARY KEY,
        passwordHash TEXT NOT NULL,
        isAdmin INTEGER NOT NULL
      )
    `);
  }

  public async tryGetUser(userName: string): Promise<User | null> {
    const statement = this.db.prepare(`
      SELECT name, passwordHash, isAdmin
      FROM users
      WHERE name = ?
      LIMIT 1
    `);
    const row = statement.get(userName) as
      | {
          name: string;
          passwordHash: string;
          isAdmin: number;
        }
      | undefined;
    return row ? new User(row.name, row.passwordHash, row.isAdmin === 1) : null;
  }

  public async insert(user: User): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO users (name, passwordHash, isAdmin)
      VALUES (?, ?, ?)
    `);
    statement.run(user.name, user.passwordHash, user.isAdmin ? 1 : 0);
  }

  public async count(): Promise<number> {
    const statement = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM users
    `);
    const row = statement.get() as { count: number };
    return row.count;
  }
}

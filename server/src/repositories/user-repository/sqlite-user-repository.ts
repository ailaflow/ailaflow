import { DatabaseSync } from 'node:sqlite';
import { UserRepository, UserRepositoryError } from './user-repository';
import { User } from './user';
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
      ) STRICT
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
    if (!row) {
      return null;
    }
    return new User(row.name, row.passwordHash, row.isAdmin === 1);
  }

  public async insert(user: User): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO users (name, passwordHash, isAdmin)
      VALUES (?, ?, ?)
    `);
    try {
      statement.run(user.name, user.passwordHash, user.isAdmin ? 1 : 0);
    } catch (e) {
      if (isDuplicateUserNameSqliteError(e)) {
        throw new UserRepositoryError('A user name is already in use');
      }
      throw e;
    }
  }

  public async update(user: User): Promise<void> {
    const statement = this.db.prepare(`
      UPDATE users
      SET
        passwordHash = ?,
        isAdmin = ?
      WHERE name = ?
    `);
    statement.run(user.passwordHash, user.isAdmin ? 1 : 0, user.name);
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

function isDuplicateUserNameSqliteError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ERR_SQLITE_ERROR' &&
    error.message.includes('UNIQUE constraint failed: users.name')
  );
}

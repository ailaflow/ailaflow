import { UserRepository, UserRepositoryError } from './user-repository';
import { User } from './user';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { Transaction } from '../../core/transaction';

export class SqliteUserRepository implements UserRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal) {
    await this.db.write(db => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          name TEXT PRIMARY KEY,
          passwordHash TEXT NOT NULL,
          isActive INTEGER NOT NULL,
          isAdmin INTEGER NOT NULL
        ) STRICT
      `);
    });
  }

  public async tryGetUser(_: AbortSignal, userName: string): Promise<User | null> {
    return this.db.read(db => {
      const statement = db.prepare(`
        SELECT name, passwordHash, isActive, isAdmin
        FROM users
        WHERE name = ?
        LIMIT 1
      `);
      const row = statement.get(userName) as
        | {
            name: string;
            passwordHash: string;
            isActive: number;
            isAdmin: number;
          }
        | undefined;
      if (!row) {
        return null;
      }
      return new User(row.name, row.passwordHash, row.isActive === 1, row.isAdmin === 1);
    });
  }

  public async insert(_: AbortSignal, user: User, transaction?: Transaction): Promise<void> {
    try {
      await this.db.write(db => {
        const statement = db.prepare(`
          INSERT INTO users (name, passwordHash, isActive, isAdmin)
          VALUES (?, ?, ?, ?)
        `);
        statement.run(user.name, user.passwordHash, user.isActive ? 1 : 0, user.isAdmin ? 1 : 0);
      }, transaction);
    } catch (e) {
      if (isDuplicateUserNameSqliteError(e)) {
        throw new UserRepositoryError('A user name is already in use');
      }
      throw e;
    }
  }

  public async update(_: AbortSignal, user: User, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = db.prepare(`
        UPDATE users
        SET
          passwordHash = ?,
          isActive = ?,
          isAdmin = ?
        WHERE name = ?
      `);
      statement.run(user.passwordHash, user.isActive ? 1 : 0, user.isAdmin ? 1 : 0, user.name);
    }, transaction);
  }

  public async count(_: AbortSignal, onlyActive: boolean): Promise<number> {
    return this.db.read(db => {
      const statement = db.prepare(`
        SELECT COUNT(*) as count
        FROM users
        WHERE (? = 0 OR isActive = 1)
      `);
      const row = statement.get(onlyActive ? 1 : 0) as { count: number };
      return row.count;
    });
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

import { DatabaseSync } from 'node:sqlite';
import { UserRepository, UserRepositoryError } from './user-repository';
import { User } from './user';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Transaction } from '../../core/transaction';
import { SqliteTransaction } from '../../core/sqlite-transaction';
import { AsyncMutex } from '../../core/async-mutex';

export class SqliteUserRepository implements UserRepository {
  private readonly db: DatabaseSync;
  private readonly dbMutex: AsyncMutex;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
    this.dbMutex = dbs.modelDbMutex;
  }

  public async setup(_: AbortSignal) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        name TEXT PRIMARY KEY,
        passwordHash TEXT NOT NULL,
        isAdmin INTEGER NOT NULL
      ) STRICT
    `);
  }

  public async tryGetUser(_: AbortSignal, userName: string): Promise<User | null> {
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

  public async insert(_: AbortSignal, user: User, transaction?: Transaction): Promise<void> {
    const t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
    try {
      const statement = this.db.prepare(`
      INSERT INTO users (name, passwordHash, isAdmin)
      VALUES (?, ?, ?)
    `);
      statement.run(user.name, user.passwordHash, user.isAdmin ? 1 : 0);
      await t.commit();
    } catch (e) {
      await t.rollback();
      if (isDuplicateUserNameSqliteError(e)) {
        throw new UserRepositoryError('A user name is already in use');
      }
      throw e;
    }
  }

  public async update(_: AbortSignal, user: User, transaction?: Transaction): Promise<void> {
    const t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
    try {
      const statement = this.db.prepare(`
      UPDATE users
      SET
        passwordHash = ?,
        isAdmin = ?
      WHERE name = ?
    `);
      statement.run(user.passwordHash, user.isAdmin ? 1 : 0, user.name);
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  public async count(_: AbortSignal): Promise<number> {
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

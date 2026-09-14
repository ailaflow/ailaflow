import { DatabaseSync } from 'node:sqlite';
import { AuthTokenRepository } from './auth-token-repository';
import { AuthToken } from './auth-token';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AsyncMutex } from '../../core/async-mutex';
import { SqliteTransaction } from '../../core/sqlite-transaction';
import { Transaction } from '../../core/transaction';

export class SqliteAuthTokenRepository implements AuthTokenRepository {
  private readonly db: DatabaseSync;
  private readonly dbMutex: AsyncMutex;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
    this.dbMutex = dbs.modelDbMutex;
  }

  public async setup(_: AbortSignal) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_tokens (
        token TEXT PRIMARY KEY,
        userName TEXT NOT NULL,
        isAdmin INTEGER NOT NULL,
        expiresAt INTEGER NOT NULL
      ) STRICT
    `);
  }

  public async upsert(_: AbortSignal, authToken: AuthToken, transaction?: Transaction): Promise<void> {
    const t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
    try {
      const statement = this.db.prepare(`
        INSERT INTO auth_tokens (token, userName, isAdmin, expiresAt)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(token) DO UPDATE SET
          userName = excluded.userName,
          isAdmin = excluded.isAdmin,
          expiresAt = excluded.expiresAt
      `);
      statement.run(authToken.token, authToken.userName, authToken.isAdmin ? 1 : 0, authToken.expiresAt);
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  public async tryGetByToken(_: AbortSignal, token: string): Promise<AuthToken | null> {
    const statement = this.db.prepare(`
      SELECT token, userName, isAdmin, expiresAt
      FROM auth_tokens
      WHERE token = ?
      LIMIT 1
    `);
    const row = statement.get(token) as
      | {
          token: string;
          userName: string;
          isAdmin: number;
          expiresAt: number;
        }
      | undefined;
    return row ? new AuthToken(row.token, row.userName, row.expiresAt, row.isAdmin === 1) : null;
  }

  public async deleteOutdated(_: AbortSignal, now: number, transaction?: Transaction): Promise<void> {
    const t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
    try {
      const statement = this.db.prepare(`
        DELETE FROM auth_tokens
        WHERE expiresAt < ?
      `);
      statement.run(now);
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }
}

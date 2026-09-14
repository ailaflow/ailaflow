import { AuthTokenRepository } from './auth-token-repository';
import { AuthToken } from './auth-token';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { Transaction } from '../../core/transaction';

export class SqliteAuthTokenRepository implements AuthTokenRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.write(db => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS auth_tokens (
          token TEXT PRIMARY KEY,
          userName TEXT NOT NULL,
          isAdmin INTEGER NOT NULL,
          expiresAt INTEGER NOT NULL
        ) STRICT
      `);
    });
  }

  public async upsert(_: AbortSignal, authToken: AuthToken, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = db.prepare(`
        INSERT INTO auth_tokens (token, userName, isAdmin, expiresAt)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(token) DO UPDATE SET
          userName = excluded.userName,
          isAdmin = excluded.isAdmin,
          expiresAt = excluded.expiresAt
      `);
      statement.run(authToken.token, authToken.userName, authToken.isAdmin ? 1 : 0, authToken.expiresAt);
    }, transaction);
  }

  public async tryGetByToken(_: AbortSignal, token: string): Promise<AuthToken | null> {
    return this.db.read(db => {
      const statement = db.prepare(`
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
    });
  }

  public async deleteOutdated(_: AbortSignal, now: number, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = db.prepare(`
        DELETE FROM auth_tokens
        WHERE expiresAt < ?
      `);
      statement.run(now);
    }, transaction);
  }
}

import { AuthTokenRepository } from './auth-token-repository';
import { AuthToken } from './auth-token';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Transaction } from '../../core/transaction';

export class SqliteAuthTokenRepository implements AuthTokenRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'auth_tokens', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE auth_tokens (
            tokenHash TEXT PRIMARY KEY,
            userName TEXT NOT NULL,
            isAdmin INTEGER NOT NULL,
            expiresAt INTEGER NOT NULL,

            FOREIGN KEY (userName)
              REFERENCES users(name)
              ON DELETE CASCADE
          ) STRICT
        `);
      }
    });
  }

  public async upsert(_: AbortSignal, authToken: AuthToken, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = db.prepare(`
        INSERT INTO auth_tokens (tokenHash, userName, isAdmin, expiresAt)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(tokenHash) DO UPDATE SET
          userName = excluded.userName,
          isAdmin = excluded.isAdmin,
          expiresAt = excluded.expiresAt
      `);
      statement.run(authToken.tokenHash, authToken.userName, authToken.isAdmin ? 1 : 0, authToken.expiresAt);
    }, transaction);
  }

  public async tryGetByTokenHash(_: AbortSignal, tokenHash: string): Promise<AuthToken | null> {
    return this.db.read(db => {
      const statement = db.prepare(`
        SELECT tokenHash, userName, isAdmin, expiresAt
        FROM auth_tokens
        WHERE tokenHash = ?
        LIMIT 1
      `);
      const row = statement.get(tokenHash) as
        | {
            tokenHash: string;
            userName: string;
            isAdmin: number;
            expiresAt: number;
          }
        | undefined;
      return row ? new AuthToken(null, row.tokenHash, row.userName, row.expiresAt, row.isAdmin === 1) : null;
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

  public async deleteForUser(_: AbortSignal, userName: string, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = db.prepare(`
        DELETE FROM auth_tokens
        WHERE userName = ?
      `);
      statement.run(userName);
    }, transaction);
  }
}

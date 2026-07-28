import { DatabaseSync } from 'node:sqlite';
import { AuthToken, AuthTokenRepository } from './auth-token-repository';
import { SqliteDatabases } from '../../core/sqlite-databases';

export class SqliteAuthTokenRepository implements AuthTokenRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.authTokenDb;
  }

  public async setup(_: AbortSignal) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS authTokens (
        token TEXT PRIMARY KEY,
        userName TEXT NOT NULL,
        isAdmin INTEGER NOT NULL,
        expiresAt INTEGER NOT NULL
      ) STRICT
    `);
  }

  public async insert(_: AbortSignal, authToken: AuthToken): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO authTokens (token, userName, isAdmin, expiresAt)
      VALUES (?, ?, ?, ?)
    `);
    statement.run(authToken.token, authToken.userName, authToken.isAdmin ? 1 : 0, authToken.expiresAt);
  }

  public async tryGetByToken(_: AbortSignal, token: string): Promise<AuthToken | null> {
    const statement = this.db.prepare(`
      SELECT token, userName, isAdmin, expiresAt
      FROM authTokens
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

  public async delete(_: AbortSignal, token: string): Promise<void> {
    const statement = this.db.prepare(`
      DELETE FROM authTokens
      WHERE token = ?
    `);
    statement.run(token);
  }

  public dispose() {
    this.db.close();
  }
}

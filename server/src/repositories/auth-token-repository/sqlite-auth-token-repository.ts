import { DatabaseSync } from 'node:sqlite';
import { AuthToken, AuthTokenRepository } from './auth-token-repository';
import { SqliteDatabases } from '../../core/sqlite-databases';

export class SqliteAuthTokenRepository implements AuthTokenRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.authTokenDb;
  }

  public async setup() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS authTokens (
        token TEXT PRIMARY KEY,
        userName TEXT NOT NULL,
        expiresAt INTEGER NOT NULL
      )
    `);
  }

  public async insert(authToken: AuthToken): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO authTokens (token, userName, expiresAt)
      VALUES (?, ?, ?)
    `);
    statement.run(authToken.token, authToken.userName, authToken.expiresAt);
  }

  public async tryGetByToken(token: string): Promise<AuthToken | null> {
    const statement = this.db.prepare(`
      SELECT token, userName, expiresAt
      FROM authTokens
      WHERE token = ?
      LIMIT 1
    `);
    const row = statement.get(token) as
      | {
          token: string;
          userName: string;
          expiresAt: number;
        }
      | undefined;
    return row ? new AuthToken(row.token, row.userName, row.expiresAt) : null;
  }

  public async delete(token: string): Promise<void> {
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

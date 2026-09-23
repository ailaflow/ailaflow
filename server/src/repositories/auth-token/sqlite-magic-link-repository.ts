import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { MagicLinkRepository } from './magic-link-repository';
import { MagicLink } from './magic-link';

export class SqliteMagicLinkRepository implements MagicLinkRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.write(db => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS magic_links (
          token TEXT PRIMARY KEY,
          userName TEXT NOT NULL,
          expiresAt INTEGER NOT NULL,

          FOREIGN KEY (userName)
            REFERENCES users(name)
            ON DELETE CASCADE,

          CHECK (expiresAt >= 0)
        ) STRICT
      `);
      db.exec(`
        CREATE INDEX IF NOT EXISTS magic_links_expires_at_idx
        ON magic_links(expiresAt)
      `);
    });
  }

  public async insert(_: AbortSignal, magicLink: MagicLink): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
        INSERT INTO magic_links (token, userName, expiresAt)
        VALUES (?, ?, ?)
      `
      ).run(magicLink.token, magicLink.userName, magicLink.expiresAt);
    });
  }

  public async consume(_: AbortSignal, token: string, now: number): Promise<string | null> {
    return this.db.write(db => {
      const row = db
        .prepare(
          `
          DELETE FROM magic_links
          WHERE token = ? AND expiresAt > ?
          RETURNING userName
        `
        )
        .get(token, now) as { userName: string } | undefined;
      return row?.userName ?? null;
    });
  }

  public async deleteExpired(_: AbortSignal, now: number): Promise<void> {
    await this.db.write(db => {
      db.prepare(`DELETE FROM magic_links WHERE expiresAt <= ?`).run(now);
    });
  }

  public async deleteForUsers(_: AbortSignal, userName: string): Promise<void> {
    await this.db.write(db => {
      db.prepare(`DELETE FROM magic_links WHERE userName = ?`).run(userName);
    });
  }
}

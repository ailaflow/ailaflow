import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { MagicLinkRepository } from './magic-link-repository';
import { MagicLink } from './magic-link';

export class SqliteMagicLinkRepository implements MagicLinkRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'magic_links', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE magic_links (
            tokenHash TEXT PRIMARY KEY,
            userName TEXT NOT NULL,
            expiresAt INTEGER NOT NULL,

            FOREIGN KEY (userName)
              REFERENCES users(name)
              ON DELETE CASCADE,

            CHECK (expiresAt >= 0)
          ) STRICT
        `);
        db.exec(`
          CREATE INDEX magic_links_expires_at_idx
          ON magic_links(expiresAt)
        `);
      }
    });
  }

  public async tryInsert(_: AbortSignal, magicLink: MagicLink): Promise<boolean> {
    return this.db.write(db => {
      return (
        db
          .prepare(
            `
            INSERT INTO magic_links (tokenHash, userName, expiresAt)
            SELECT ?, name, ?
            FROM users
            WHERE name = ? AND isActive = 1
          `
          )
          .run(magicLink.tokenHash, magicLink.expiresAt, magicLink.userName).changes > 0
      );
    });
  }

  public async consume(_: AbortSignal, tokenHash: string, now: number): Promise<string | null> {
    return this.db.write(db => {
      const row = db
        .prepare(
          `
          DELETE FROM magic_links
          WHERE tokenHash = ? AND expiresAt > ?
          RETURNING userName
        `
        )
        .get(tokenHash, now) as { userName: string } | undefined;
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

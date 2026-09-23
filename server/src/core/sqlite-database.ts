import { DatabaseSync } from 'node:sqlite';
import { AsyncMutex } from './async-mutex';
import { Transaction } from './transaction';

export class SqliteDatabase {
  private readonly mutex = new AsyncMutex();

  public constructor(private readonly db: DatabaseSync) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS _version (
        tableName TEXT PRIMARY KEY,
        version INTEGER NOT NULL
      ) STRICT
    `);
  }

  public async setup(codeVersion: number, tableName: string, callback: (db: DatabaseSync, dbVersion: number) => void): Promise<void> {
    await this.write(db => {
      const row = db.prepare(`SELECT version FROM _version WHERE tableName = ?`).get(tableName) as { version: number } | undefined;
      const dbVersion = row?.version ?? 0;
      if (dbVersion >= codeVersion) {
        return;
      }

      callback(db, dbVersion);
      db.prepare(
        `
            INSERT INTO _version (tableName, version)
            VALUES (?, ?)
            ON CONFLICT(tableName) DO UPDATE SET version = excluded.version
        `
      ).run(tableName, codeVersion);
    });
  }

  public async read<T>(callback: (db: DatabaseSync) => Promise<T> | T): Promise<T> {
    const release = await this.mutex.acquire();
    try {
      return await callback(this.db);
    } finally {
      release();
    }
  }

  public async write<T>(callback: (db: DatabaseSync) => Promise<T> | T, transaction?: Transaction): Promise<T> {
    if (transaction) {
      if (transaction.handler) {
        if (this.db !== transaction.db) {
          throw new Error('Transaction is associated with a different database');
        }
        return callback(this.db);
      }

      const release = await this.mutex.acquire();
      try {
        this.db.exec('BEGIN IMMEDIATE');
      } catch (e) {
        release();
        throw e;
      }

      transaction.db = this.db;
      transaction.handler = {
        commit: async () => {
          this.db.exec('COMMIT');
          release();
        },
        rollback: async () => {
          try {
            this.db.exec('ROLLBACK');
          } finally {
            release();
          }
        }
      };

      return await callback(this.db);
    }

    const release = await this.mutex.acquire();
    try {
      this.db.exec('BEGIN IMMEDIATE');
    } catch (e) {
      release();
      throw e;
    }

    try {
      const result = await callback(this.db);
      this.db.exec('COMMIT');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    } finally {
      release();
    }
  }
}

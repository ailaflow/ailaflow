import { DatabaseSync } from 'node:sqlite';
import { ServerPaths } from './server-paths';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { AsyncMutex } from './async-mutex';
import { Transaction } from './transaction';

export class SqliteDatabases {
  public readonly modelDb: SqliteDatabase;
  public readonly dataDb: SqliteDatabase;
  private readonly dbs: DatabaseSync[] = [];

  public constructor(serverPaths: ServerPaths) {
    const dataFolderPath = serverPaths.getAppDataFolderPath();
    mkdirSync(dataFolderPath, { recursive: true });

    try {
      this.modelDb = this.create(join(dataFolderPath, 'model.db'));
      this.dataDb = this.create(join(dataFolderPath, 'data.db'));
    } catch (e) {
      this.dispose();
      throw e;
    }
  }

  private create(filePath: string): SqliteDatabase {
    const db = new DatabaseSync(filePath, {
      open: true
    });
    this.dbs.push(db);
    db.exec(`PRAGMA foreign_keys = ON`);
    return new SqliteDatabase(db);
  }

  public dispose() {
    for (const db of this.dbs) {
      db.close();
    }
    this.dbs.length = 0;
  }
}

export class SqliteDatabase {
  private readonly mutex = new AsyncMutex();

  public constructor(private readonly db: DatabaseSync) {}

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

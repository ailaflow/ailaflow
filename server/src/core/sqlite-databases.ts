import { DatabaseSync } from 'node:sqlite';
import { ServerPaths } from './server-paths';
import { chmodSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SqliteDatabase } from './sqlite-database';

export class SqliteDatabases {
  public readonly modelDb: SqliteDatabase;
  public readonly dataDb: SqliteDatabase;
  private readonly dbs: DatabaseSync[] = [];

  public constructor(serverPaths: ServerPaths) {
    const dataFolderPath = serverPaths.getAppDataFolderPath();
    mkdirSync(dataFolderPath, { recursive: true, mode: 0o700 });
    ensurePermissions(dataFolderPath, 0o700);

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
    ensurePermissions(filePath, 0o600);
    db.exec(`PRAGMA foreign_keys = ON`);
    return new SqliteDatabase(db);
  }

  public readonly dispose = () => {
    for (const db of this.dbs) {
      db.close();
    }
    this.dbs.length = 0;
  };
}

function ensurePermissions(path: string, expectedMode: number): void {
  if ((statSync(path).mode & 0o777) !== expectedMode) {
    chmodSync(path, expectedMode);
  }
}

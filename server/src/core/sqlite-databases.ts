import { DatabaseSync } from 'node:sqlite';
import { ServerPaths } from './server-paths';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { AsyncMutex } from './async-mutex';

export class SqliteDatabases {
  public readonly modelDb: DatabaseSync;
  public readonly modelDbMutex = new AsyncMutex();
  public readonly dataDb: DatabaseSync;
  public readonly dataDbMutex = new AsyncMutex();
  private readonly dbs: DatabaseSync[] = [];

  public constructor(serverPaths: ServerPaths) {
    const dataFolderPath = serverPaths.getDatabaseFolderPath();
    mkdirSync(dataFolderPath, { recursive: true });

    this.modelDb = this.create(join(dataFolderPath, 'model.db'));
    this.dataDb = this.create(join(dataFolderPath, 'data.db'));
  }

  private create(filePath: string): DatabaseSync {
    const db = new DatabaseSync(filePath, {
      open: true
    });
    db.exec(`PRAGMA foreign_keys = ON`);
    this.dbs.push(db);
    return db;
  }

  public dispose() {
    for (const db of this.dbs) {
      db.close();
    }
  }
}

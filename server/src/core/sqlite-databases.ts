import { DatabaseSync } from 'node:sqlite';
import { ServerPaths } from './server-paths';
import path from 'path';

export class SqliteDatabases {
  public readonly authTokenDb: DatabaseSync;
  public readonly modelDb: DatabaseSync;

  public constructor(serverPaths: ServerPaths) {
    const dataFolderPath = serverPaths.getDatabaseFolderPath();

    this.authTokenDb = new DatabaseSync(path.join(dataFolderPath, 'authToken.db'), {
      open: true
    });
    this.modelDb = new DatabaseSync(path.join(dataFolderPath, 'model.db'), {
      open: true
    });

    for (const db of [this.authTokenDb, this.modelDb]) {
      db.exec(`PRAGMA foreign_keys = ON`);
    }
  }

  public dispose() {
    this.authTokenDb.close();
    this.modelDb.close();
  }
}

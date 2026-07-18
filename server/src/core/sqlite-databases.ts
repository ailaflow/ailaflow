import { DatabaseSync } from 'node:sqlite';
import { ServerPaths } from './server-paths';
import path from 'path';

export class SqliteDatabases {
  public readonly userDb: DatabaseSync;
  public readonly authTokenDb: DatabaseSync;
  public readonly modelDb: DatabaseSync;

  public constructor(serverPaths: ServerPaths) {
    const dataFolderPath = serverPaths.getDatabaseFolderPath();

    this.userDb = new DatabaseSync(path.join(dataFolderPath, 'users.db'), {
      open: true
    });
    this.authTokenDb = new DatabaseSync(path.join(dataFolderPath, 'authToken.db'), {
      open: true
    });
    this.modelDb = new DatabaseSync(path.join(dataFolderPath, 'model.db'), {
      open: true
    });

    for (const db of [this.userDb, this.authTokenDb, this.modelDb]) {
      db.exec(`PRAGMA foreign_keys = ON`);
    }
  }

  public dispose() {
    this.userDb.close();
    this.authTokenDb.close();
    this.modelDb.close();
  }
}

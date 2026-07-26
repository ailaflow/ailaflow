import { DatabaseSync } from 'node:sqlite';
import { ServerPaths } from './server-paths';
import { join } from 'path';

export class SqliteDatabases {
  public readonly authTokenDb: DatabaseSync;
  public readonly modelDb: DatabaseSync;
  public readonly chatSessionDb: DatabaseSync;
  private readonly dbs: DatabaseSync[] = [];

  public constructor(serverPaths: ServerPaths) {
    const dataFolderPath = serverPaths.getDatabaseFolderPath();

    this.authTokenDb = this.create(join(dataFolderPath, 'authToken.db'));
    this.modelDb = this.create(join(dataFolderPath, 'model.db'));
    this.chatSessionDb = this.create(join(dataFolderPath, 'chatSession.db'));
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

import path from 'path';
import fs from 'fs';

export class ServerPaths {
  private readonly rootPath: string;

  public constructor() {
    const cwd = path.resolve(process.cwd(), '..');
    if (fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'))) {
      this.rootPath = cwd;
      return;
    }
    throw new Error('Cannot locate the project root');
  }
  public getAilaFolderPath(): string {
    return this.rootPath;
  }

  public getAppDataFolderPath(): string {
    return this.rootPath;
  }

  public getDatabaseFolderPath(): string {
    return path.join(this.getAppDataFolderPath(), 'data', 'database');
  }
}

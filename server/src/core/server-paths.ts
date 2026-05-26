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

  public getSandboxFolderPath(): string {
    return path.join(this.rootPath, 'sandbox');
  }

  public getDataFolderPath(): string {
    return path.join(this.rootPath, 'data');
  }
}

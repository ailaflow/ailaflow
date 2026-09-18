import { join } from 'path';
import { ServerPaths } from './server-paths';
import { readFileSync } from 'fs';

export class VersionProvider {
  private version: string | null = null;

  public constructor(private readonly serverPaths: ServerPaths) {}

  public get(): string {
    if (!this.version) {
      const path = join(this.serverPaths.getRuntimeFolderPath(), '../../package.json');
      const content = readFileSync(path, 'utf-8');
      const pack = JSON.parse(content) as { version: string };
      this.version = pack.version;
    }
    return this.version;
  }
}

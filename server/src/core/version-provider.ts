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

  public meetsMin(minimumVersion: string): boolean {
    const currentParts = parseVersion(this.get());
    const minimumParts = parseVersion(minimumVersion);
    for (let i = 0; i < 3; i++) {
      const current = currentParts[i];
      const minimum = minimumParts[i];
      if (current > minimum) {
        return true;
      }
      if (current < minimum) {
        return false;
      }
    }
    return true;
  }
}

function parseVersion(v: string): number[] {
  const parts = v.split('.').map(Number);
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${v}`);
  }
  return parts;
}

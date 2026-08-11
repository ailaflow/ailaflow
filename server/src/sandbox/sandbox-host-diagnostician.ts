import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import { ServerPaths } from '../core/server-paths';
import { Docker } from './docker';

export interface SandboxHostDiagnosticianResult {
  dockerVersion: string | null;
  isAppFolderReadable: boolean;
  isDataFolderWritable: boolean;
}

export class SandboxHostDiagnostician {
  public constructor(private readonly paths: ServerPaths) {}

  public async diagnose(): Promise<SandboxHostDiagnosticianResult> {
    return {
      dockerVersion: await this.checkDocker(),
      isAppFolderReadable: await this.checkPath(this.paths.getAilaFolderPath(), constants.R_OK),
      isDataFolderWritable: await this.checkPath(this.paths.getAppDataFolderPath(), constants.W_OK)
    };
  }

  private async checkDocker() {
    try {
      const docker = new Docker(this.paths.getAilaFolderPath());
      const info = await docker.info();
      return info.ClientInfo.Version;
    } catch {
      return null;
    }
  }

  private async checkPath(path: string, mode: number): Promise<boolean> {
    try {
      await fs.access(path, mode);
      return true;
    } catch {
      return false;
    }
  }
}

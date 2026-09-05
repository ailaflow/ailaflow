import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import { ServerPaths } from '../core/server-paths';
import { Docker } from './docker';

export interface SandboxHostDiagnosticianResult {
  dockerVersion: string | null;
  appFolderPath: string;
  dataFolderPath: string;
  isAppFolderReadable: boolean;
  isDataFolderWritable: boolean;
}

export class SandboxHostDiagnostician {
  public constructor(private readonly paths: ServerPaths) {}

  public async diagnose(abortSignal: AbortSignal): Promise<SandboxHostDiagnosticianResult> {
    const appFolderPath = this.paths.getRuntimeFolderPath();
    const dataFolderPath = this.paths.getAppDataFolderPath();

    return {
      dockerVersion: await this.checkDocker(abortSignal),
      appFolderPath,
      dataFolderPath,
      isAppFolderReadable: await this.checkPath(appFolderPath, constants.R_OK),
      isDataFolderWritable: await this.checkPath(dataFolderPath, constants.W_OK)
    };
  }

  private async checkDocker(abortSignal: AbortSignal) {
    try {
      const docker = new Docker(this.paths.getRuntimeFolderPath());
      const info = await docker.info(abortSignal);
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

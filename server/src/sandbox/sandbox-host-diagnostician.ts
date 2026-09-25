import { constants } from 'node:fs';
import { ServerPaths } from '../core/server-paths';
import { Docker } from './docker';
import fs from 'node:fs/promises';

export interface SandboxHostDiagnosticianResult {
  dockerVersion: string | null;
  dockerError: string | null;
  appFolderPath: string;
  dataFolderPath: string;
  isAppFolderReadable: boolean;
  isDataFolderWritable: boolean;
}

export class SandboxHostDiagnostician {
  public constructor(private readonly paths: ServerPaths) {}

  public async diagnose(signal: AbortSignal): Promise<SandboxHostDiagnosticianResult> {
    const appFolderPath = this.paths.getRuntimeFolderPath();
    const dataFolderPath = this.paths.getAppDataFolderPath();

    const [d, isAppFolderReadable, isDataFolderWritable] = await Promise.all([
      this.checkDocker(signal),
      this.checkPath(appFolderPath, constants.R_OK),
      this.checkPath(dataFolderPath, constants.W_OK)
    ]);

    return {
      dockerVersion: d.version,
      dockerError: d.error,
      appFolderPath,
      dataFolderPath,
      isAppFolderReadable,
      isDataFolderWritable
    };
  }

  private async checkDocker(signal: AbortSignal) {
    try {
      const docker = new Docker(this.paths.getRuntimeFolderPath());
      const info = await docker.info(signal);
      return {
        version: info.ClientInfo.Version,
        error: null
      };
    } catch (e) {
      return {
        version: null,
        error: e instanceof Error ? e.message : String(e)
      };
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

import path from 'node:path';

function requiredPath(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return path.resolve(value);
}

export class ServerPaths {
  private readonly appDataFolderPath: string;
  private readonly portalFolderPath: string;
  private readonly runtimeFolderPath: string;

  public constructor() {
    this.appDataFolderPath = requiredPath('AILA_DATA_DIR');
    this.portalFolderPath = requiredPath('AILA_PORTAL_DIR');
    this.runtimeFolderPath = requiredPath('AILA_RUNTIME_DIR');
  }

  public getRuntimeFolderPath(): string {
    return this.runtimeFolderPath;
  }

  public getPortalFolderPath(): string {
    return this.portalFolderPath;
  }

  public getAppDataFolderPath(): string {
    return this.appDataFolderPath;
  }

  public getDatabaseFolderPath(): string {
    return path.join(this.getAppDataFolderPath(), 'data', 'database');
  }
}

import { join } from 'node:path';

export class SandboxHostPaths {
  public constructor(
    public readonly ailaFolderAbsolutePath: string,
    public readonly appDataFolderAbsolutePath: string,
    public readonly sandboxName: string
  ) {}

  public readonly dataFolderAbsolutePath = join(this.appDataFolderAbsolutePath, `data/sandbox_${this.sandboxName}`);
  public readonly appFolderAbsolutePath = join(this.appDataFolderAbsolutePath, `temp/sandbox_${this.sandboxName}`);
  public readonly dockerfileAbsolutePath = join(this.appDataFolderAbsolutePath, `temp/sandbox_${this.sandboxName}/Dockerfile`);
}

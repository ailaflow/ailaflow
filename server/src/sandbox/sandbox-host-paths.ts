import { join } from 'node:path';

export class SandboxHostPaths {
  public constructor(
    public readonly runtimeFolderAbsolutePath: string,
    public readonly appDataFolderAbsolutePath: string,
    public readonly sandboxName: string
  ) {}

  public readonly dataFolderAbsolutePath = join(this.appDataFolderAbsolutePath, `sandbox/${this.sandboxName}/data`);
  public readonly appFolderAbsolutePath = join(this.appDataFolderAbsolutePath, `sandbox/${this.sandboxName}/temp`);
  public readonly dockerfileAbsolutePath = join(this.appDataFolderAbsolutePath, `sandbox/${this.sandboxName}/temp/Dockerfile`);
}

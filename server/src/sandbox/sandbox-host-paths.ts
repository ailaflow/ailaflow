import { join } from 'node:path';

export class SandboxHostPaths {
  public constructor(
    public readonly runtimeFolderAbsolutePath: string,
    public readonly appDataFolderAbsolutePath: string,
    public readonly sandboxName: string
  ) {}

  // Separating sandbox data from temporary files makes it easy to export data for all sandboxes without including temporary files.
  public readonly dataFolderAbsolutePath = join(this.appDataFolderAbsolutePath, `sandbox_data/${this.sandboxName}`);
  public readonly appFolderAbsolutePath = join(this.appDataFolderAbsolutePath, `sandbox_app/${this.sandboxName}`);
  public readonly dockerfileAbsolutePath = join(this.appDataFolderAbsolutePath, `sandbox_app/${this.sandboxName}/Dockerfile`);
}

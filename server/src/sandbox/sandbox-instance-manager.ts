import { ServerPaths } from '../core/server-paths';
import { ContainerRepository } from '../repositories/container-repository/container-repository';
import { SandboxInstance } from './sandbox-instance';
import { SandboxRuntimeHandler } from './sandbox-runtime';

export class SandboxIntanceManager {
  private readonly instances = new Map<string, SandboxInstance>();

  public constructor(
    private readonly paths: ServerPaths,
    private readonly containerRepository: ContainerRepository
  ) {}

  public async get(abortSignal: AbortSignal, containerName: string): Promise<SandboxInstance> {
    let sandbox = this.instances.get(containerName);
    if (!sandbox) {
      const container = await this.containerRepository.tryGet(containerName);
      if (!container) {
        throw new Error(`Cannot find container: ${containerName}`);
      }

      const handler: SandboxRuntimeHandler = {
        onSandboxClose: () => {},
        onSandboxRpc: async (instanceName: string, type: string, payload: object) => {
          return {};
        }
      };

      sandbox = await SandboxInstance.create(
        abortSignal,
        this.paths.getAilaFolderPath(),
        this.paths.getAppDataFolderPath(),
        container.name,
        container,
        handler
      );
      this.instances.set(containerName, sandbox);
    }
    return sandbox;
  }

  public async stop(error?: Error) {
    await Promise.allSettled([...this.instances.values()].map(sandbox => sandbox.runtime.tryStop(error)));
    this.instances.clear();
  }
}

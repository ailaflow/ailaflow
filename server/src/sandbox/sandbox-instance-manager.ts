import { ServerPaths } from '../core/server-paths';
import { SandboxRepository } from '../repositories/sandbox-repository/sandbox-repository';
import { SandboxInstance } from './sandbox-instance';
import { SandboxRuntimeHandler } from './sandbox-runtime';

export class SandboxInstanceManager {
  private readonly instances = new Map<string, SandboxInstance>();

  public constructor(
    private readonly paths: ServerPaths,
    private readonly sandboxRepository: SandboxRepository
  ) {}

  public async get(abortSignal: AbortSignal, sandboxName: string): Promise<SandboxInstance> {
    let instance = this.instances.get(sandboxName);
    if (!instance) {
      const sandbox = await this.sandboxRepository.tryGet(sandboxName);
      if (!sandbox) {
        throw new Error(`Cannot find sandbox: ${sandboxName}`);
      }

      const handler: SandboxRuntimeHandler = {
        onSandboxClose: () => {},
        onSandboxRpc: async (_, name, type, __, token) => {
          return {
            call: `${type} called on ${name} with token ${token}`
          };
        }
      };

      instance = await SandboxInstance.create(
        abortSignal,
        this.paths.getAilaFolderPath(),
        this.paths.getAppDataFolderPath(),
        sandbox.name,
        sandbox,
        handler
      );
      this.instances.set(sandboxName, instance);
    }
    return instance;
  }

  public async stop(error?: Error) {
    await Promise.allSettled([...this.instances.values()].map(sandbox => sandbox.runtime.tryStop(error)));
    this.instances.clear();
  }
}

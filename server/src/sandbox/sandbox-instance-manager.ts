import { ServerPaths } from '../core/server-paths';
import { SandboxRepository } from '../repositories/sandbox-repository/sandbox-repository';
import { SandboxInstance } from './sandbox-instance';
import { SandboxRpcHandlerProvider } from './sandbox-rpc-handler-provider';

export class SandboxInstanceManager {
  private readonly instances = new Map<string, SandboxInstance>();

  public constructor(
    private readonly paths: ServerPaths,
    private readonly sandboxRepository: SandboxRepository,
    private readonly rpcHandlerProvider: SandboxRpcHandlerProvider
  ) {}

  public async getOrCreate(abortSignal: AbortSignal, sandboxName: string): Promise<SandboxInstance> {
    let instance = this.instances.get(sandboxName);
    if (!instance) {
      const sandbox = await this.sandboxRepository.tryGet(sandboxName);
      if (!sandbox) {
        throw new Error(`Cannot find sandbox: ${sandboxName}`);
      }

      instance = await SandboxInstance.create(
        abortSignal,
        this.paths.getAilaFolderPath(),
        this.paths.getAppDataFolderPath(),
        sandbox.name,
        sandbox,
        this.rpcHandlerProvider
      );
      instance.onClose.subscribe(() => this.instances.delete(sandboxName));
      this.instances.set(sandboxName, instance);
    }
    return instance;
  }

  public async stop(error?: Error) {
    await Promise.allSettled([...this.instances.values()].map(sandbox => sandbox.tryStop(error)));
    this.instances.clear();
  }
}

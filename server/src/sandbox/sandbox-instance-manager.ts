import { ServerPaths } from '../core/server-paths';
import { SandboxRepository } from '../repositories/sandbox/sandbox-repository';
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
      const sandbox = await this.sandboxRepository.tryGet(abortSignal, sandboxName);
      if (!sandbox) {
        throw new Error(`Cannot find sandbox: ${sandboxName}`);
      }

      instance = await SandboxInstance.create(
        abortSignal,
        this.paths.getRuntimeFolderPath(),
        this.paths.getAppDataFolderPath(),
        sandbox,
        this.rpcHandlerProvider
      );
      instance.onClose.subscribe(() => this.instances.delete(sandboxName));
      this.instances.set(sandboxName, instance);
    }
    return instance;
  }

  public tryGet(sandboxName: string): SandboxInstance | undefined {
    return this.instances.get(sandboxName);
  }

  public async stopAll(abortSignal: AbortSignal, error?: Error) {
    for (const instance of this.instances.values()) {
      try {
        await instance.tryStop(abortSignal, error);
      } catch (err) {
        // Ignore
      }
    }
    this.instances.clear();
  }
}

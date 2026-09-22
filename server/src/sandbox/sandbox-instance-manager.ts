import { AsyncMutex } from '../core/async-mutex';
import { ServerPaths } from '../core/server-paths';
import { SandboxRepository } from '../repositories/sandbox/sandbox-repository';
import { SandboxInstance } from './sandbox-instance';
import { SandboxRpcHandlerProvider } from './sandbox-rpc-handler-provider';

export class SandboxInstanceManager {
  private readonly mutex = new AsyncMutex();
  private readonly instances = new Map<string, SandboxInstance>();

  public constructor(
    private readonly paths: ServerPaths,
    private readonly sandboxRepository: SandboxRepository,
    private readonly rpcHandlerProvider: SandboxRpcHandlerProvider
  ) {}

  public async getOrCreate(signal: AbortSignal, sandboxName: string): Promise<SandboxInstance> {
    let instance = this.instances.get(sandboxName);
    if (instance) {
      return instance;
    }

    const release = await this.mutex.acquire();
    try {
      const sandbox = await this.sandboxRepository.tryGet(signal, sandboxName);
      if (!sandbox) {
        throw new Error(`Cannot find sandbox: ${sandboxName}`);
      }

      instance = await SandboxInstance.create(
        signal,
        this.paths.getRuntimeFolderPath(),
        this.paths.getAppDataFolderPath(),
        sandbox,
        this.rpcHandlerProvider
      );
      instance.onClose.subscribe(() => this.instances.delete(sandboxName));
      this.instances.set(sandboxName, instance);
      return instance;
    } finally {
      release();
    }
  }

  public tryGet(sandboxName: string): SandboxInstance | undefined {
    return this.instances.get(sandboxName);
  }

  public async stopAll(signal: AbortSignal, error?: Error) {
    for (const instance of this.instances.values()) {
      try {
        await instance.tryStop(signal, error);
      } catch (err) {
        // Ignore
      }
    }
    this.instances.clear();
  }
}

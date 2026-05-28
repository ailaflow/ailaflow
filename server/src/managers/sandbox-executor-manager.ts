import { SandboxExecutor } from '../sandbox/sandbox-executor';
import { SandboxManager } from './sandbox-manager';

export class SandboxExecutorManager {
  private readonly executors = new Map<string, SandboxExecutor>();

  public constructor(private readonly sandboxManager: SandboxManager) {}

  public async get(abortSignal: AbortSignal, instanceId: string): Promise<SandboxExecutor> {
    let executor = this.executors.get(instanceId);
    if (!executor) {
      const sandbox = await this.sandboxManager.get(abortSignal, instanceId);
      executor = new SandboxExecutor(sandbox);
      this.executors.set(instanceId, executor);
    }
    return executor;
  }
}

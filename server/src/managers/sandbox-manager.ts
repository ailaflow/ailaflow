import { ServerPaths } from '../core/server-paths';
import { Sandbox, SandboxHandler } from '../sandbox/sandbox';

export class SandboxManager {
  private readonly sandboxes = new Map<string, Sandbox>();

  public constructor(private readonly pathsProvider: ServerPaths) {}

  public async get(abortSignal: AbortSignal, instanceId: string): Promise<Sandbox> {
    let sandbox = this.sandboxes.get(instanceId);
    if (!sandbox) {
      const handler: SandboxHandler = {
        onSandboxClose: () => {},
        onSandboxRpc: async (instanceId: string, type: string, payload: object) => {
          return {};
        }
      };

      sandbox = await Sandbox.create(abortSignal, this.pathsProvider.getSandboxFolderPath(), instanceId, handler);
      this.sandboxes.set(instanceId, sandbox);
    }
    return sandbox;
  }

  public async stop(error?: Error) {
    await Promise.allSettled([...this.sandboxes.values()].map(sandbox => sandbox.tryStop(error)));
    this.sandboxes.clear();
  }
}

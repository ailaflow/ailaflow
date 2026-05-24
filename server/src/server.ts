import { Logger } from './core/logger';
import { SandboxPaths } from './sandbox/sandbox-paths';
import express from 'express';
import { SandboxManager } from './managers/sandbox-manager';
import { SandboxExecutorManager } from './managers/sandbox-executor-manager';

const PORT = process.env.PORT || 3000;

const logger = new Logger('Server');

export class Server {
  public static async create(abortSignal: AbortSignal): Promise<Server> {
    const sandboxPaths = new SandboxPaths();
    const sandboxManager = new SandboxManager(sandboxPaths);
    const sandboxExecutorManager = new SandboxExecutorManager(sandboxManager);

    const instanceId = 'instance-1';

    const scriptExecutor = await sandboxExecutorManager.get(abortSignal, instanceId);

    const app = express();

    for (let i = 0; i < 5; i++) {
      const bashAbortSignal = AbortSignal.timeout(10_000);
      const res = await scriptExecutor.execute(bashAbortSignal, {
        folderPath: 'test',
        scriptName: 'test.mjs',
        input: {
          testsInput: 'test'
        }
      });
      console.log('Execution result:', res);
    }

    app.listen(PORT, () => {
      logger.log(`Server is running on port ${PORT}`);
    });

    return new Server(sandboxManager);
  }

  public constructor(private readonly sandboxManager: SandboxManager) {}

  public close() {
    this.sandboxManager.tryStop();
  }
}

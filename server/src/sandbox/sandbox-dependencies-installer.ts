import { Process } from '../repositories/process/process';
import { SandboxHostPaths } from './sandbox-host-paths';
import { SandboxRuntime } from './sandbox-runtime';
import { HttpSseHandler } from '../core/http-client';
import { ExecuteCommandUpdate } from './bridge-client';
import { Logger } from '../core/logger';

export class SandboxDependenciesInstaller {
  private readonly logger = new Logger(SandboxDependenciesInstaller.name);

  public constructor(
    private readonly runtime: SandboxRuntime,
    private readonly paths: SandboxHostPaths
  ) {}

  public async install(signal: AbortSignal, process: Process, handler?: HttpSseHandler<ExecuteCommandUpdate>) {
    const startTime = Date.now();

    const result = await this.runtime.executeCommand(
      signal,
      {
        cwd: `/app/${process.name}`,
        command: 'pnpm',
        args: ['install']
      },
      handler
    );

    if (result.code !== 0) {
      throw new Error(`Failed to install dependencies: ${result.stdout} ${result.stderr}`);
    }

    const endTime = Date.now();
    this.logger.log(`Installed dependencies for /${process.name}, sandbox: +${this.paths.sandboxName}, time: ${endTime - startTime}ms`);
  }
}

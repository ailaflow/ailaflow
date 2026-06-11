import { Process } from '../repositories/process-repository/process-repository';
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

  public async install(abortSignal: AbortSignal, process: Process, handler?: HttpSseHandler<ExecuteCommandUpdate>) {
    const startTime = Date.now();

    const result = await this.runtime.runCommand(
      abortSignal,
      {
        cwd: `/app/${process.name}`,
        command: 'pnpm',
        args: ['install']
      },
      handler
    );

    if (result.code !== 0) {
      throw new Error(`Failed to install dependencies: ${result.stderr}`);
    }

    const endTime = Date.now();
    this.logger.log(`Installed dependencies for process ${process.name} in sandbox ${this.paths.sandboxName} in ${endTime - startTime}ms`);
  }
}

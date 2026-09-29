import { ScriptDefinition } from '@ailaflow/shared';
import { SandboxInstanceManager } from '../../sandbox/sandbox-instance-manager';
import { Process } from '../../repositories/process/process';
import { ProcessLogger } from './process-logger';
import { HttpSseHandler } from '../../core/http-client';
import { ExecuteCommandUpdate } from '../../sandbox/bridge-client';

export class ProcessScriptExecutor {
  public constructor(
    private readonly executionId: string,
    private readonly process: Process,
    private readonly logger: ProcessLogger,
    private readonly sandboxInstanceManager: SandboxInstanceManager
  ) {}

  public async execute(signal: AbortSignal, stepId: string, script: ScriptDefinition) {
    const instance = await this.sandboxInstanceManager.getOrCreate(signal, script.sandboxName);

    const sseMaterializeHandler: HttpSseHandler<ExecuteCommandUpdate> = {
      onData: data => {
        if (data.stdout) {
          this.logger.materializerStdout(data.stdout);
        } else if (data.stderr) {
          this.logger.materializerStderr(data.stderr);
        }
      },
      onClose() {}
    };

    await instance.tryMaterializeProcess(signal, this.process, sseMaterializeHandler);

    const scriptHandler: HttpSseHandler<ExecuteCommandUpdate> = {
      onData: data => {
        if (data.stdout) {
          this.logger.scriptStdout(data.stdout);
        } else if (data.stderr) {
          this.logger.scriptStderr(data.stderr);
        }
      },
      onClose() {}
    };

    const result = await instance.executeScript(
      signal,
      {
        cwd: `/app/${this.process.name}/${stepId}`,
        scriptName: 'main.js',
        executionId: this.executionId
      },
      scriptHandler
    );

    this.logger.scriptFinished(result.totalTime, result.result.code);
  }
}

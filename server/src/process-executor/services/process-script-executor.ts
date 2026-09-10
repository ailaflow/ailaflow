import { ScriptDefinition } from '@ailaflow/model';
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

  public async execute(abortSignal: AbortSignal, stepId: string, script: ScriptDefinition) {
    const instance = await this.sandboxInstanceManager.getOrCreate(abortSignal, script.sandboxName);

    const sseHandler: HttpSseHandler<ExecuteCommandUpdate> = {
      onData: data => {
        if (data.stdout) {
          this.logger.info(`stdout: ${data.stdout}`);
        } else if (data.stderr) {
          this.logger.info(`stderr: ${data.stderr}`);
        }
      },
      onClose() {
        //
      }
    };

    await instance.tryMaterializeProcess(abortSignal, this.process, sseHandler);

    const result = await instance.executeScript(
      abortSignal,
      {
        cwd: `/app/${this.process.name}/${stepId}`,
        scriptName: 'main.js',
        executionId: this.executionId
      },
      sseHandler
    );

    this.logger.info(`Script returned: ${JSON.stringify(result)}`);
  }
}

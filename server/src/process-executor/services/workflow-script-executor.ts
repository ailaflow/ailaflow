import { Script } from '@aila/model';
import { SandboxInstanceManager } from '../../sandbox/sandbox-instance-manager';
import { Process } from '../../repositories/process-repository/process-repository';
import { WorkflowLogger } from './workflow-logger';
import { HttpSseHandler } from '../../core/http-client';
import { ExecuteCommandUpdate } from '../../sandbox/bridge-client';

export class WorkflowScriptExecutor {
  public constructor(
    private readonly executionToken: string,
    private readonly process: Process,
    private readonly logger: WorkflowLogger,
    private readonly sandboxInstanceManager: SandboxInstanceManager
  ) {}

  public async execute(abortSignal: AbortSignal, stepId: string, script: Script) {
    const instance = await this.sandboxInstanceManager.get(abortSignal, script.sandboxName);

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

    const commit = await instance.materializer.tryBeginMaterializationOfProcess(abortSignal, this.process);
    if (commit) {
      await instance.dependenciesInstaller.install(abortSignal, this.process, sseHandler);
      await commit();
    }

    const result = await instance.executor.execute(
      abortSignal,
      {
        cwd: `/app/${this.process.name}/${stepId}`,
        scriptName: 'main.js',
        executionToken: this.executionToken
      },
      sseHandler
    );

    this.logger.info(`Script returned: ${JSON.stringify(result)}`);
  }
}

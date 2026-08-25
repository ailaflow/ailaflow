import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';
import { ProcessExecutionStore } from '../process-execution-store';

export class GetStartedByRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'getStartedBy';

  public constructor(private readonly executionStore: ProcessExecutionStore) {}

  public async handle(_abortSignal: AbortSignal, _sandboxName: string, executionId: string): Promise<string> {
    const execution = this.executionStore.get(executionId);
    return execution.context.startedBy;
  }
}

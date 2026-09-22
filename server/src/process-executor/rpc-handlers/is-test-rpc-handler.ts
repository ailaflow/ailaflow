import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';
import { ProcessExecutionStore } from '../process-execution-store';

export class IsTestRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'isTest';

  public constructor(private readonly executionStore: ProcessExecutionStore) {}

  public async handle(_signal: AbortSignal, _sandboxName: string, executionId: string): Promise<boolean> {
    const execution = this.executionStore.get(executionId);
    return execution.context.isTest;
  }
}

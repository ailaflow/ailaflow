import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';
import { ProcessExecutionStore } from '../process-execution-store';

export class GetUserAccessExpressionRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'getUserAccessExpression';

  public constructor(private readonly executionStore: ProcessExecutionStore) {}

  public async handle(_signal: AbortSignal, _sandboxName: string, executionId: string): Promise<string> {
    const execution = this.executionStore.get(executionId);
    return execution.getUserAccessExpression();
  }
}

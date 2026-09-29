import { UserAccessExpressionParser } from '@ailaflow/shared';
import { UserAccessExpressionUserQuerier } from '../../queriers/user-access-expression/user-access-expression-user-querier';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';
import { ProcessExecutionStore } from '../process-execution-store';

export class ResolveProcessUserAccessRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'resolveProcessUserAccess';

  public constructor(
    private readonly executionStore: ProcessExecutionStore,
    private readonly userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier
  ) {}

  public handle(signal: AbortSignal, _sandboxName: string, executionId: string): Promise<string[]> {
    const execution = this.executionStore.get(executionId);
    const expression = execution.getUserAccessExpression();
    const parsedExpression = UserAccessExpressionParser.parse(expression);
    return this.userAccessExpressionUserQuerier.queryUserNames(signal, parsedExpression);
  }
}

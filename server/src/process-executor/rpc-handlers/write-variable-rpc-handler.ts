import z from 'zod';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';
import { ProcessExecutionStore } from '../process-execution-store';

const requestSchema = z.object({
  name: z.string(),
  value: z.unknown()
});

export class WriteVariableRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'writeVariable';

  public constructor(private readonly executionStore: ProcessExecutionStore) {}

  public async handle(_abortSignal: AbortSignal, _: string, executionId: string, data: object): Promise<true> {
    const request = requestSchema.parse(data);

    const execution = this.executionStore.get(executionId);
    execution.writeVariable(request.name, request.value);
    return true;
  }
}

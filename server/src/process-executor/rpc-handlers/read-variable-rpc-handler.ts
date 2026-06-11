import z from 'zod';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';
import { ProcessExecutionStore } from '../process-execution-store';

const requestSchema = z.object({
  name: z.string()
});

export class ReadVariableRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'readVariable';

  public constructor(private readonly executionStore: ProcessExecutionStore) {}

  public async handle(_abortSignal: AbortSignal, _: string, executionId: string, data: object): Promise<unknown> {
    const request = requestSchema.parse(data);

    const execution = this.executionStore.get(executionId);
    return execution.readVariable(request.name);
  }
}

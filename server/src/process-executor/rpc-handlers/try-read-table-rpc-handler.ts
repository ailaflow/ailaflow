import { TableRow } from '@ailaflow/shared';
import z from 'zod';
import { TableDataRepository } from '../../repositories/table/table-data-repository';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';

const requestSchema = z.object({
  name: z.string(),
  _id: z.string()
});

export class TryReadTableRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'tryReadTable';

  public constructor(private readonly repository: TableDataRepository) {}

  public async handle(abortSignal: AbortSignal, _sandboxName: string, _executionId: string, data: object): Promise<TableRow | null> {
    const request = requestSchema.parse(data);
    return this.repository.tryGet(abortSignal, request.name, request._id);
  }
}

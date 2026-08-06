import z from 'zod';
import { TableDataRepository } from '../../repositories/table/table-data-repository';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';

const requestSchema = z.object({
  name: z.string(),
  pk: z.string()
});

export class TryReadTableRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'tryReadTable';

  public constructor(private readonly repository: TableDataRepository) {}

  public async handle(abortSignal: AbortSignal, _sandboxName: string, _executionId: string, data: object): Promise<unknown> {
    const request = requestSchema.parse(data);
    const tableData = await this.repository.tryGet(abortSignal, request.name, request.pk);
    return tableData ? tableData.data : null;
  }
}

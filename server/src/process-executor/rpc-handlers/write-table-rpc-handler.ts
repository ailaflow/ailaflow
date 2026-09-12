import z from 'zod';
import { TableDataRepository } from '../../repositories/table/table-data-repository';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';

const requestSchema = z.object({
  name: z.string(),
  row: z
    .object({
      _id: z.string()
    })
    .catchall(z.unknown())
});

export class WriteTableRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'writeTable';

  public constructor(private readonly repository: TableDataRepository) {}

  public async handle(abortSignal: AbortSignal, _sandboxName: string, _executionId: string, data: object): Promise<true> {
    const request = requestSchema.parse(data);
    await this.repository.upsert(abortSignal, request.name, request.row);
    return true;
  }
}

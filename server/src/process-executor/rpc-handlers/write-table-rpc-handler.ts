import z from 'zod';
import { TableDataRepository } from '../../repositories/table/table-data-repository';
import { TableSchemaManager } from '../../repositories/table/table-schema-manager';
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

  public constructor(
    private readonly repository: TableDataRepository,
    private readonly schemaManager: TableSchemaManager
  ) {}

  public async handle(abortSignal: AbortSignal, _sandboxName: string, _executionId: string, data: object): Promise<true> {
    const request = requestSchema.parse(data);
    const schema = await this.schemaManager.ensureCompatible(abortSignal, request.name, request.row);
    await this.repository.upsert(abortSignal, schema, request.row);
    return true;
  }
}

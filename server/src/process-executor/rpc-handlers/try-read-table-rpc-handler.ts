import { TableRow } from '@ailaflow/shared';
import z from 'zod';
import { TableDataRepository } from '../../repositories/table/table-data-repository';
import { TableSchemaManager } from '../../repositories/table/table-schema-manager';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';

const requestSchema = z.object({
  name: z.string(),
  _id: z.string()
});

export class TryReadTableRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'tryReadTable';

  public constructor(
    private readonly repository: TableDataRepository,
    private readonly schemaManager: TableSchemaManager
  ) {}

  public async handle(abortSignal: AbortSignal, _sandboxName: string, _executionId: string, data: object): Promise<TableRow | null> {
    const request = requestSchema.parse(data);
    const schema = await this.schemaManager.get(abortSignal, request.name);
    return this.repository.tryGet(abortSignal, schema, request._id);
  }
}

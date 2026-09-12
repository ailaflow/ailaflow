import z from 'zod';
import { TableDataListQuerier } from '../../queriers/table-data-list/table-data-list-querier';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';

const requestSchema = z.object({
  name: z.string(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  orderBy: z.string(),
  ascending: z.boolean()
});

export class ReadTablePageRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'readTablePage';

  public constructor(private readonly querier: TableDataListQuerier) {}

  public async handle(abortSignal: AbortSignal, _sandboxName: string, _executionId: string, data: object) {
    const request = requestSchema.parse(data);
    return this.querier.query(abortSignal, request.name, request.page, request.pageSize, request.orderBy, request.ascending);
  }
}

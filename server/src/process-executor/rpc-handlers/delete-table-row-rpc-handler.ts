import z from 'zod';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';
import { TableManager } from '../../table/table-manager';

const requestSchema = z.object({
  name: z.string(),
  _id: z.string()
});

export class DeleteTableRowRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'deleteTableRow';

  public constructor(private readonly tableManager: TableManager) {}

  public async handle(signal: AbortSignal, _sandboxName: string, _executionId: string, data: object): Promise<boolean> {
    const request = requestSchema.parse(data);
    return this.tableManager.deleteRow(signal, request.name, request._id);
  }
}

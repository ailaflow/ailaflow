import z from 'zod';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';
import { TableManager } from '../../table/table-manager';

const requestSchema = z.object({
  name: z.string(),
  row: z
    .object({
      _id: z.string()
    })
    .catchall(z.unknown())
});

export class WriteTableRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'writeTableRow';

  public constructor(private readonly tableManager: TableManager) {}

  public async handle(signal: AbortSignal, _sandboxName: string, _executionId: string, data: object): Promise<true> {
    const request = requestSchema.parse(data);
    await this.tableManager.writeRow(signal, request.name, request.row);
    return true;
  }
}

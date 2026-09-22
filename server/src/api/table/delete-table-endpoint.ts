import { DeleteTableResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { TableManager } from '../../table/table-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class DeleteTableEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/tables/:name';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly tableManager: Pick<TableManager, 'delete'>) {}

  public async handle(req: Request): Promise<DeleteTableResponse> {
    const signal = getEndpointAbortSignal(req);
    const tableName = String(req.params.name);
    const deleted = await this.tableManager.delete(signal, tableName);
    if (!deleted) {
      throw new EndpointError('Table not found', 404);
    }

    return { name: tableName };
  }
}

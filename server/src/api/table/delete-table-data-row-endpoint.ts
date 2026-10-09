import { Request } from 'express';
import { TableManager } from '../../table/table-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class DeleteTableDataRowEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/tables/:name/data-row/:id';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly tableManager: Pick<TableManager, 'deleteRow'>) {}

  public async handle(req: Request) {
    const signal = getEndpointAbortSignal(req);
    const tableName = String(req.params.name);
    const id = String(req.params.id);
    await this.tableManager.deleteRow(signal, tableName, id);
    return {};
  }
}

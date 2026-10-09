import { GetTableDataPageResponse, getTableDataPageRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { TableManager } from '../../table/table-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseQuery } from '../framework/parse-request';

export class GetTableDataPageEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/tables/:name/data';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly tableManager: TableManager) {}

  public async handle(req: Request): Promise<GetTableDataPageResponse> {
    const signal = getEndpointAbortSignal(req);
    const tableName = String(req.params.name);
    const { page, pageSize, orderBy, ascending } = parseQuery(getTableDataPageRequestSchema, req.query);
    return this.tableManager.readPage(signal, tableName, {
      page,
      pageSize,
      orderBy,
      ascending
    });
  }
}

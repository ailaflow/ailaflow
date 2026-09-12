import { GetTableDataResponse, getTableDataRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { TableDataListQuerier } from '../../queriers/table-data-list/table-data-list-querier';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseQuery } from '../framework/parse-request';

export class GetTableDataEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/tables/:name/data';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: TableDataListQuerier) {}

  public async handle(req: Request): Promise<GetTableDataResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const tableName = String(req.params.name);
    const { page, pageSize, orderBy, ascending } = parseQuery(getTableDataRequestSchema, req.query);
    return this.querier.query(abortSignal, tableName, page, pageSize, orderBy, ascending);
  }
}

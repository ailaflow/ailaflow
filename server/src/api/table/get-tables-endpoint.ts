import { GetTablesResponse, getTablesRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { TableListQuerier } from '../../queriers/table-list/table-list-querier';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseQuery } from '../framework/parse-request';

export class GetTablesEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/tables';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: TableListQuerier) {}

  public async handle(req: Request): Promise<GetTablesResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { page, pageSize } = parseQuery(getTablesRequestSchema, req.query);
    return this.querier.query(abortSignal, page, pageSize);
  }
}

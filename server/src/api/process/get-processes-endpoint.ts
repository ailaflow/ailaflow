import { ProcessListQuerier } from '../../queriers/process-list/process-list-querier';
import { Endpoint } from '../framework/endpoint';
import { GetProcessesResponse, ProcessDisplay, getProcessesRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseQuery } from '../framework/parse-request';

export class GetProcessesEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/processes';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: ProcessListQuerier) {}

  public async handle(req: Request): Promise<GetProcessesResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { page, pageSize, search } = parseQuery(getProcessesRequestSchema, req.query);
    return this.querier.query(abortSignal, page, pageSize, ProcessDisplay.HIDDEN, search);
  }
}

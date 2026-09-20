import { GetMyProcessesResponse, getMyProcessesRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { MyProcessListQuerier } from '../../queriers/my-process-list/my-process-list-querier';
import { parseQuery } from '../framework/parse-request';

export class GetMyProcessesEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-processes';
  public readonly auth = true;

  public constructor(private readonly querier: MyProcessListQuerier) {}

  public async handle(req: Request): Promise<GetMyProcessesResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);
    const { page, pageSize, displayAtLeast } = parseQuery(getMyProcessesRequestSchema, req.query);
    return this.querier.query(abortSignal, authToken.userName, page, pageSize, displayAtLeast);
  }
}

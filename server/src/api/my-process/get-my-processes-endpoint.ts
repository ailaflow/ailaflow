import { GetMyProcessesResponse } from '@aila/model';
import { Request } from 'express';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { MyProcessListQuerier } from '../../queriers/my-process-list/my-process-list-querier';

export class GetMyProcessesEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-processes';
  public readonly auth = true;

  public constructor(private readonly querier: MyProcessListQuerier) {}

  public async handle(req: Request): Promise<GetMyProcessesResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);

    return {
      processes: await this.querier.query(abortSignal, authToken.userName)
    };
  }
}

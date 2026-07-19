import { ProcessListQuerier } from '../../queriers/process-list/process-list-querier';
import { Endpoint } from '../framework/endpoint';
import { GetProcessesResponse } from '@aila/model';
import { Request } from 'express';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetProcessesEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/processes';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: ProcessListQuerier) {}

  public async handle(req: Request): Promise<GetProcessesResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    return {
      processes: await this.querier.query(abortSignal)
    };
  }
}

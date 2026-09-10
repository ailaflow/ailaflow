import { GetSandboxesResponse } from '@ailaflow/shared';
import { SandboxListQuerier } from '../../queriers/sandbox-list/sandbox-list-querier';
import { Endpoint } from '../framework/endpoint';
import { Request } from 'express';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetSandboxesEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/sandboxes';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: SandboxListQuerier) {}

  public async handle(req: Request): Promise<GetSandboxesResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    return {
      sandboxes: await this.querier.query(abortSignal)
    };
  }
}

import { GetSandboxesResponse } from '@aila/model';
import { SandboxListQuerier } from '../../queriers/sandbox-list/sandbox-list-querier';
import { Endpoint } from '../endpoint';

export class GetSandboxesEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/sandboxes';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: SandboxListQuerier) {}

  public async handle(): Promise<GetSandboxesResponse> {
    return {
      sandboxes: await this.querier.query()
    };
  }
}

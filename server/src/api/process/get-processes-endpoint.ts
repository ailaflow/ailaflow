import { ProcessListQuerier } from '../../queriers/process-list/process-list-querier';
import { Endpoint } from '../endpoint';
import { GetProcessesResponse } from '@aila/model';

export class GetProcessesEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/processes';
  public readonly auth = true;

  public constructor(private readonly querier: ProcessListQuerier) {}

  public async handle(): Promise<GetProcessesResponse> {
    return {
      processes: await this.querier.query()
    };
  }
}

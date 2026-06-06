import { GetContainersResponse } from '@aila/model';
import { ContainerListQuerier } from '../../queriers/container-list/container-list-querier';
import { Endpoint } from '../endpoint';

export class GetContainersEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/containers';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: ContainerListQuerier) {}

  public async handle(): Promise<GetContainersResponse> {
    return {
      containers: await this.querier.query()
    };
  }
}

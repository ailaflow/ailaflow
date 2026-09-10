import { HealthResponse } from '@ailaflow/shared';
import { Endpoint } from '../framework/endpoint';

export class HealthEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/health';

  public async handle(): Promise<HealthResponse> {
    return { server: 'ailaflow', status: 'ok' };
  }
}

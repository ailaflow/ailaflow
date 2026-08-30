import { HealthResponse } from '@aila/model';
import { Endpoint } from '../framework/endpoint';

export class HealthEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/health';

  public async handle(): Promise<HealthResponse> {
    return { server: 'aila', status: 'ok' };
  }
}

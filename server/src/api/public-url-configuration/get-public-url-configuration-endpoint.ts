import { GetPublicUrlConfigurationResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { KvConfigurationManager } from '../../configuration/kv/kv-configuration-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetPublicUrlConfigurationEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/public-url-configuration';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly manager: KvConfigurationManager) {}

  public async handle(req: Request): Promise<GetPublicUrlConfigurationResponse> {
    const signal = getEndpointAbortSignal(req);
    return { publicUrl: (await this.manager.get(signal)).publicUrl };
  }
}

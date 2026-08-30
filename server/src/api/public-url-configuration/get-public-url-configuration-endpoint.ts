import { GetPublicUrlConfigurationResponse } from '@aila/model';
import { Request } from 'express';
import { PublicUrlConfigurationRepository } from '../../repositories/configuration/public-url/public-url-configuration-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetPublicUrlConfigurationEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/public-url-configuration';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: PublicUrlConfigurationRepository) {}

  public async handle(req: Request): Promise<GetPublicUrlConfigurationResponse> {
    const configuration = await this.repository.get(getEndpointAbortSignal(req));
    return { publicUrl: configuration.publicUrl };
  }
}

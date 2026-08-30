import { savePublicUrlConfigurationRequestSchema, SavePublicUrlConfigurationResponse } from '@aila/model';
import { Request } from 'express';
import { PublicUrlConfiguration, PublicUrlConfigurationError } from '../../repositories/configuration/public-url/public-url-configuration';
import { PublicUrlConfigurationRepository } from '../../repositories/configuration/public-url/public-url-configuration-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class SavePublicUrlConfigurationEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/public-url-configuration';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: PublicUrlConfigurationRepository) {}

  public async handle(req: Request): Promise<SavePublicUrlConfigurationResponse> {
    const request = parseBody(savePublicUrlConfigurationRequestSchema, req.body);
    try {
      const configuration = PublicUrlConfiguration.create(request.publicUrl);
      await this.repository.save(getEndpointAbortSignal(req), configuration);
      return { publicUrl: configuration.publicUrl };
    } catch (error) {
      if (error instanceof PublicUrlConfigurationError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
  }
}

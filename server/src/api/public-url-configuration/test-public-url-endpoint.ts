import { testPublicUrlRequestSchema, TestPublicUrlResponse } from '@aila/model';
import { Request } from 'express';
import { PublicUrlTester } from '../../configuration/public-url/public-url-tester';
import { PublicUrlConfiguration, PublicUrlConfigurationError } from '../../repositories/configuration/public-url/public-url-configuration';
import { PublicUrlConfigurationRepository } from '../../repositories/configuration/public-url/public-url-configuration-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class TestPublicUrlEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/public-url-configuration/test';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly repository: PublicUrlConfigurationRepository,
    private readonly tester: PublicUrlTester
  ) {}

  public async handle(req: Request): Promise<TestPublicUrlResponse> {
    const request = parseBody(testPublicUrlRequestSchema, req.body);
    try {
      const abortSignal = getEndpointAbortSignal(req);
      const configuration = request.publicUrl ? PublicUrlConfiguration.create(request.publicUrl) : await this.repository.get(abortSignal);
      return configuration.publicUrl
        ? this.tester.test(abortSignal, configuration.publicUrl)
        : { publicUrl: null, isAvailable: false, error: 'Public URL is not configured.' };
    } catch (error) {
      if (error instanceof PublicUrlConfigurationError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
  }
}

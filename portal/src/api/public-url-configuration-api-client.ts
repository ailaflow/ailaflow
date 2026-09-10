import { HttpClient } from '@aibindkit/react';
import type {
  GetPublicUrlConfigurationResponse,
  SavePublicUrlConfigurationRequest,
  SavePublicUrlConfigurationResponse,
  TestPublicUrlRequest,
  TestPublicUrlResponse
} from '@ailaflow/shared';

export class PublicUrlConfigurationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public get(abortSignal: AbortSignal): Promise<GetPublicUrlConfigurationResponse> {
    return this.client.json(abortSignal, 'GET', '/api/public-url-configuration');
  }

  public save(abortSignal: AbortSignal, request: SavePublicUrlConfigurationRequest): Promise<SavePublicUrlConfigurationResponse> {
    return this.client.json(abortSignal, 'POST', '/api/public-url-configuration', request);
  }

  public test(abortSignal: AbortSignal, request: TestPublicUrlRequest): Promise<TestPublicUrlResponse> {
    return this.client.json(abortSignal, 'POST', '/api/public-url-configuration/test', request);
  }
}

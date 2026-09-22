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

  public get(signal: AbortSignal): Promise<GetPublicUrlConfigurationResponse> {
    return this.client.json(signal, 'GET', '/api/public-url-configuration');
  }

  public save(signal: AbortSignal, request: SavePublicUrlConfigurationRequest): Promise<SavePublicUrlConfigurationResponse> {
    return this.client.json(signal, 'POST', '/api/public-url-configuration', request);
  }

  public test(signal: AbortSignal, request: TestPublicUrlRequest): Promise<TestPublicUrlResponse> {
    return this.client.json(signal, 'POST', '/api/public-url-configuration/test', request);
  }
}

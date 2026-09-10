import { HttpClient } from '@aibindkit/react';
import type { GetLicenseConfigurationResponse, GetLicenseStatusResponse, SaveLicenseConfigurationRequest } from '@ailaflow/shared';

export class LicenseConfigurationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getStatus(abortSignal: AbortSignal): Promise<GetLicenseStatusResponse> {
    return this.client.json(abortSignal, 'GET', '/license-status');
  }

  public get(abortSignal: AbortSignal): Promise<GetLicenseConfigurationResponse> {
    return this.client.json(abortSignal, 'GET', '/api/license-configuration');
  }

  public save(abortSignal: AbortSignal, request: SaveLicenseConfigurationRequest): Promise<void> {
    return this.client.json(abortSignal, 'POST', '/api/license-configuration', request);
  }
}

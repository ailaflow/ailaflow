import { HttpClient } from '@aibindkit/react';
import type { GetLicenseConfigurationResponse, GetLicenseStatusResponse, SaveLicenseConfigurationRequest } from '@ailaflow/shared';

export class LicenseConfigurationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getStatus(signal: AbortSignal): Promise<GetLicenseStatusResponse> {
    return this.client.json(signal, 'GET', '/license-status');
  }

  public get(signal: AbortSignal): Promise<GetLicenseConfigurationResponse> {
    return this.client.json(signal, 'GET', '/api/license-configuration');
  }

  public save(signal: AbortSignal, request: SaveLicenseConfigurationRequest): Promise<void> {
    return this.client.json(signal, 'POST', '/api/license-configuration', request);
  }
}

import { HttpClient } from '@aibindkit/react';
import type { CanInstallResponse, InstallRequest, InstallResponse } from '@ailaflow/shared';

export class InstallApiClient {
  public constructor(private readonly client: HttpClient) {}

  public canInstall(signal: AbortSignal): Promise<CanInstallResponse> {
    return this.client.json(signal, 'GET', '/api/install/can-install');
  }

  public install(signal: AbortSignal, request: InstallRequest): Promise<InstallResponse> {
    return this.client.json(signal, 'POST', '/api/install', request);
  }
}

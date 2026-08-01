import { HttpClient } from '@aibindkit/react';
import type { InstallRequest, InstallResponse } from '@aila/model';

export class InstallApiClient {
  public constructor(private readonly client: HttpClient) {}

  public install(abortSignal: AbortSignal, request: InstallRequest): Promise<InstallResponse> {
    return this.client.json(abortSignal, 'POST', '/api/install', request);
  }
}

import { HttpClient, HttpClientSseListener } from '@aibindkit/react';
import type {
  DiagnoseHostResponse,
  ExecuteSandboxCommandRequest,
  ExecuteSandboxCommandUpdate,
  GetSandboxResponse,
  GetSandboxesResponse,
  SaveSandboxRequest
} from '@ailaflow/shared';

export class SandboxApiClient {
  public constructor(private readonly client: HttpClient) {}

  public saveSandbox(abortSignal: AbortSignal, request: SaveSandboxRequest): Promise<void> {
    return this.client.json(abortSignal, 'POST', '/api/sandbox', request);
  }

  public getSandboxes(abortSignal: AbortSignal): Promise<GetSandboxesResponse> {
    return this.client.json(abortSignal, 'GET', '/api/sandboxes');
  }

  public getSandbox(abortSignal: AbortSignal, name: string): Promise<GetSandboxResponse> {
    return this.client.json(abortSignal, 'GET', `/api/sandboxes/${encodeURIComponent(name)}`);
  }

  public diagnoseHost(abortSignal: AbortSignal): Promise<DiagnoseHostResponse> {
    return this.client.json(abortSignal, 'GET', '/api/sandboxes/diagnose-host');
  }

  public executeCommand(
    abortSignal: AbortSignal,
    listener: HttpClientSseListener<ExecuteSandboxCommandUpdate>,
    name: string,
    request: ExecuteSandboxCommandRequest
  ): Promise<void> {
    return this.client.sse(abortSignal, listener, 'POST', `/api/sandboxes/${encodeURIComponent(name)}/commands`, request);
  }
}

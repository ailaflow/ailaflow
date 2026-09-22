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

  public saveSandbox(signal: AbortSignal, request: SaveSandboxRequest): Promise<void> {
    return this.client.json(signal, 'POST', '/api/sandbox', request);
  }

  public getSandboxes(signal: AbortSignal): Promise<GetSandboxesResponse> {
    return this.client.json(signal, 'GET', '/api/sandboxes');
  }

  public getSandbox(signal: AbortSignal, name: string): Promise<GetSandboxResponse> {
    return this.client.json(signal, 'GET', `/api/sandboxes/${encodeURIComponent(name)}`);
  }

  public diagnoseHost(signal: AbortSignal): Promise<DiagnoseHostResponse> {
    return this.client.json(signal, 'GET', '/api/sandboxes/diagnose-host');
  }

  public executeCommand(
    signal: AbortSignal,
    listener: HttpClientSseListener<ExecuteSandboxCommandUpdate>,
    name: string,
    request: ExecuteSandboxCommandRequest
  ): Promise<void> {
    return this.client.sse(signal, listener, 'POST', `/api/sandboxes/${encodeURIComponent(name)}/commands`, request);
  }
}

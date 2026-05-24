import { HttpClient, HttpSseHandler } from '../core/http-client';

export interface GetHealthResponse {
  status: string;
}

export interface ExecCommandRequest {
  folderPath: string;
  command: string;
  args?: string[];
  stdin?: string;
}

export interface ExecCommandUpdate {
  stdout?: string;
  stderr?: string;
  error?: string;
  close?: {
    code: number;
    signal: string | null;
  };
}

export interface ListenRpcUpdate {
  ping?: number;
  rpc?: {
    id: string;
    type: string;
    payload: object;
  };
}

export interface SendRpcResponseRequest {
  id: string;
  type: string;
  payload?: object;
  error?: string;
}

export class BridgeClient {
  private readonly httpClient = new HttpClient(this.baseUrl);

  public constructor(private readonly baseUrl: URL) {}

  public getHealth(abortSignal: AbortSignal): Promise<GetHealthResponse> {
    return this.httpClient.json<GetHealthResponse>(abortSignal, 'GET', '/health');
  }

  public execCommand(abortSignal: AbortSignal, request: ExecCommandRequest, handler: HttpSseHandler<ExecCommandUpdate>): Promise<void> {
    return this.httpClient.sse(abortSignal, 'POST', '/command', request, handler);
  }

  public listenRpc(abortSignal: AbortSignal, handler: HttpSseHandler<ListenRpcUpdate>): Promise<void> {
    return this.httpClient.sse(abortSignal, 'GET', '/rpc', undefined, handler);
  }

  public sendRpcResponse(abortSignal: AbortSignal, request: SendRpcResponseRequest): Promise<void> {
    return this.httpClient.json<void>(abortSignal, 'POST', '/rpc-response', request);
  }
}

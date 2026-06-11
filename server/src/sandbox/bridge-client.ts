import { HttpClient, HttpSseHandler } from '../core/http-client';

export interface GetHealthResponse {
  status: string;
}

export interface ExecuteCommandRequest {
  cwd: string;
  command: string;
  args?: string[];
  stdin?: string;
  env?: Record<string, string>;
}

export interface ExecuteCommandUpdate {
  stdout?: string;
  stderr?: string;
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
    executionToken: string;
    timeout: number;
  };
}

export interface SendRpcReplyRequest {
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

  public executeCommand(
    abortSignal: AbortSignal,
    request: ExecuteCommandRequest,
    handler: HttpSseHandler<ExecuteCommandUpdate>
  ): Promise<void> {
    return this.httpClient.sse<ExecuteCommandUpdate>(abortSignal, 'POST', '/command', request, handler);
  }

  public listenRpc(abortSignal: AbortSignal, handler: HttpSseHandler<ListenRpcUpdate>): Promise<void> {
    return this.httpClient.sse<ListenRpcUpdate>(abortSignal, 'GET', '/rpc', undefined, handler);
  }

  public sendRpcReply(abortSignal: AbortSignal, request: SendRpcReplyRequest): Promise<void> {
    return this.httpClient.json<void>(abortSignal, 'POST', '/rpc-reply', request);
  }
}

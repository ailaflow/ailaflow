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
  error?: string;
  close?: {
    code: number;
    signal: string | null;
  };
}

export interface ListenRpcUpdate {
  ping?: number;
  rpc?: {
    callId: number;
    executionId: string;
    methodName: string;
    data: object;
    timeout: number;
  };
}

export interface SendRpcReplyRequest {
  callId: number;
  data?: unknown;
  error?: string;
}

export class BridgeClient {
  private readonly httpClient = new HttpClient(this.baseUrl);

  public constructor(private readonly baseUrl: URL) {}

  public getHealth(signal: AbortSignal): Promise<GetHealthResponse> {
    return this.httpClient.json<GetHealthResponse>(signal, 'GET', '/health');
  }

  public executeCommand(
    signal: AbortSignal,
    request: ExecuteCommandRequest,
    token: string,
    handler: HttpSseHandler<ExecuteCommandUpdate>
  ): Promise<void> {
    return this.httpClient.sse<ExecuteCommandUpdate>(
      signal,
      'POST',
      '/command',
      request,
      {
        'x-token': token
      },
      handler
    );
  }

  public listenRpc(signal: AbortSignal, token: string, handler: HttpSseHandler<ListenRpcUpdate>): Promise<void> {
    return this.httpClient.sse<ListenRpcUpdate>(
      signal,
      'GET',
      '/rpc',
      undefined,
      {
        'x-token': token
      },
      handler
    );
  }

  public sendRpcReply(signal: AbortSignal, token: string, request: SendRpcReplyRequest): Promise<void> {
    return this.httpClient.json<void>(signal, 'POST', '/rpc-reply', request, {
      'x-token': token
    });
  }
}

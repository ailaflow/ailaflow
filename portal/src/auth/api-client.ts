import { HttpClient, HttpClientSseListener } from './http-client';
import type {
  ChatUpdate,
  RestoreChatRequest,
  SendChatMessageRequest,
  SendChatMessageResponse,
  SendFrontendToolResultRequest
} from '@aibindkit/model';
import type { ChatTransport, ChatTransportListener } from '@aibindkit/react';
import type {
  GetSandboxResponse,
  GetSandboxesResponse,
  GetProcessesResponse,
  GetProcessResponse,
  InstallRequest,
  InstallResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  TestProcessRequest,
  TestProcessUpdate,
  UpdateProcessRequest,
  UpdateProcessResponse,
  UpsertSandboxRequest
} from '@aila/model';

export class ApiClient {
  private readonly client: HttpClient;
  public readonly install: InstallApiClient;
  public readonly auth: AuthApiClient;
  public readonly chat: ChatApiClient;
  public readonly process: ProcessApiClient;
  public readonly sandbox: SandboxApiClient;

  public constructor(authToken: string | null) {
    this.client = new HttpClient(authToken);
    this.install = new InstallApiClient(this.client);
    this.auth = new AuthApiClient(this.client);
    this.chat = new ChatApiClient(this.client);
    this.process = new ProcessApiClient(this.client);
    this.sandbox = new SandboxApiClient(this.client);
  }

  public setOnUnauthorizedListener(listener: (() => void) | null) {
    this.client.setOnUnauthorizedListener(listener);
  }

  public updateAuthToken(authToken: string) {
    this.client.updateAuthToken(authToken);
  }
}

export class InstallApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async install(abortSignal: AbortSignal, request: InstallRequest): Promise<InstallResponse> {
    return this.client.json(abortSignal, 'POST', '/api/install', request);
  }
}

export class AuthApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async login(abortSignal: AbortSignal, request: LoginRequest): Promise<LoginResponse> {
    return this.client.json(abortSignal, 'POST', '/api/auth/login', request);
  }

  public async refreshToken(abortSignal: AbortSignal, request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.client.json(abortSignal, 'POST', '/api/auth/token/refresh', request);
  }
}

export class ChatApiClient implements ChatTransport {
  public constructor(private readonly client: HttpClient) {}

  public async restoreChat(
    abortSignal: AbortSignal,
    listener: ChatTransportListener,
    request: RestoreChatRequest
  ): Promise<void> {
    return this.client.sse(abortSignal, listener, 'POST', '/api/chat', request);
  }

  public async sendChatMessage(abortSignal: AbortSignal, request: SendChatMessageRequest): Promise<SendChatMessageResponse> {
    return this.client.json(abortSignal, 'POST', '/api/chat/message', request);
  }

  public async sendFrontendToolResult(abortSignal: AbortSignal, request: SendFrontendToolResultRequest): Promise<void> {
    return this.client.json(abortSignal, 'POST', '/api/chat/front-end-tool', request);
  }
}

export class ProcessApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async updateProcess(abortSignal: AbortSignal, request: UpdateProcessRequest): Promise<UpdateProcessResponse> {
    return this.client.json(abortSignal, 'POST', '/api/process', request);
  }

  public async getProcesses(abortSignal: AbortSignal): Promise<GetProcessesResponse> {
    return this.client.json(abortSignal, 'GET', '/api/processes');
  }

  public async getProcess(abortSignal: AbortSignal, id: string): Promise<GetProcessResponse> {
    return this.client.json(abortSignal, 'GET', `/api/processes/${id}`);
  }

  public async testProcess(
    abortSignal: AbortSignal,
    listener: HttpClientSseListener<TestProcessUpdate>,
    id: string,
    request: TestProcessRequest
  ) {
    return this.client.sse(abortSignal, listener, 'POST', `/api/processes/${id}/test`, request);
  }
}

export class SandboxApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async upsertSandbox(abortSignal: AbortSignal, request: UpsertSandboxRequest): Promise<void> {
    return this.client.json(abortSignal, 'POST', '/api/sandbox', request);
  }

  public async getSandboxes(abortSignal: AbortSignal): Promise<GetSandboxesResponse> {
    return this.client.json(abortSignal, 'GET', '/api/sandboxes');
  }

  public async getSandbox(abortSignal: AbortSignal, name: string): Promise<GetSandboxResponse> {
    return this.client.json(abortSignal, 'GET', `/api/sandboxes/${encodeURIComponent(name)}`);
  }
}

import { HttpClient, HttpClientSseListener } from './http-client';
import {
  ChatUpdate,
  InstallRequest,
  InstallResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RestoreChatRequest,
  SendChatMessageRequest,
  SendChatMessageResponse
} from '@aila/model';

export class ApiClient {
  private readonly client = new HttpClient();

  public setOnUnauthorizedListener(listener: (() => void) | null) {
    this.client.setOnUnauthorizedListener(listener);
  }

  public setAuthToken(token: string | null) {
    this.client.setAuthToken(token);
  }

  public readonly install = new InstallApiClient(this.client);
  public readonly auth = new AuthApiClient(this.client);
  public readonly chat = new ChatApiClient(this.client);
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

export class ChatApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async restoreChat(
    abortSignal: AbortSignal,
    request: RestoreChatRequest,
    listener: HttpClientSseListener<ChatUpdate>
  ): Promise<void> {
    return this.client.sse(abortSignal, listener, 'POST', '/api/chat', request);
  }

  public async sendChatMessage(abortSignal: AbortSignal, request: SendChatMessageRequest): Promise<SendChatMessageResponse> {
    return this.client.json(abortSignal, 'POST', '/api/chat/message', request);
  }
}

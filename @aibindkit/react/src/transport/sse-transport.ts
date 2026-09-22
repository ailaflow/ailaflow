import type {
  RestoreChatRequest,
  SendChatMessageRequest,
  SendChatMessageResponse,
  SendFrontendToolResultRequest,
  ChatTransport,
  ChatTransportListener,
  InterruptChatRequest,
  RestartChatRequest
} from '@aibindkit/core';
import { HttpClient } from './http-client';

export class SseTransport implements ChatTransport {
  private readonly client: HttpClient;

  public constructor(clientOrHeaders: HttpClient | Record<string, string> = {}) {
    this.client = clientOrHeaders instanceof HttpClient ? clientOrHeaders : new HttpClient(clientOrHeaders);
  }

  public get onUnauthorized() {
    return this.client.onUnauthorized;
  }

  public updateHeaders(headers: Record<string, string>) {
    this.client.updateHeaders(headers);
  }

  public async restoreChat(signal: AbortSignal, listener: ChatTransportListener, request: RestoreChatRequest): Promise<void> {
    return this.client.sse(signal, listener, 'POST', '/api/chat', request);
  }

  public async sendChatMessage(signal: AbortSignal, request: SendChatMessageRequest): Promise<SendChatMessageResponse> {
    return this.client.json(signal, 'POST', '/api/chat/message', request);
  }

  public async sendFrontendToolResult(signal: AbortSignal, request: SendFrontendToolResultRequest): Promise<void> {
    return this.client.json(signal, 'POST', '/api/chat/front-end-tool', request);
  }

  public async interruptChat(signal: AbortSignal, request: InterruptChatRequest): Promise<void> {
    return this.client.json(signal, 'POST', '/api/chat/interrupt', request);
  }

  public async restartChat(signal: AbortSignal, request: RestartChatRequest): Promise<void> {
    return this.client.json(signal, 'POST', '/api/chat/restart', request);
  }
}

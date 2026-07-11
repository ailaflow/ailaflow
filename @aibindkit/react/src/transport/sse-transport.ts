import type {
  RestoreChatRequest,
  SendChatMessageRequest,
  SendChatMessageResponse,
  SendFrontendToolResultRequest,
  ChatTransport,
  ChatTransportListener
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

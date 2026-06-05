import { Request } from 'express';
import { Endpoint } from '../endpoint';
import { getAuthToken } from '../auth/auth-middleware';
import { EndpointError } from '../endpoint-error';
import { sendChatMessageRequest, SendChatMessageResponse } from '@aila/model';
import { ChatSessionStore } from '../../chat-session/stores/chat-session-store';

export class SendChatMessageEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat/message';
  public readonly auth = true;

  public constructor(private readonly chatSessionStore: ChatSessionStore) {}

  public async handle(req: Request): Promise<SendChatMessageResponse> {
    const authToken = getAuthToken(req);
    const request = sendChatMessageRequest.parse(req.body);

    const chatSession = this.chatSessionStore.tryGet(authToken.userName, request.chatSessionId);
    if (!chatSession) {
      throw new EndpointError('Chat session not found', 404);
    }

    return {
      id: chatSession.queueUserMessage(request.message)
    };
  }
}

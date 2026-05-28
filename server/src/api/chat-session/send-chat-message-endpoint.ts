import { Request } from 'express';
import { Endpoint } from '../endpoint';
import { getAuthToken } from '../auth/auth-middleware';
import { ChatSessionProvider } from '../../chat-session/chat-session-provider';
import { EndpointError } from '../endpoint-error';
import { sendChatMessageRequest, SendChatMessageResponse } from '@aila/model';

export class SendChatMessageEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat/message';
  public readonly auth = true;

  public constructor(private readonly chatSessionProvider: ChatSessionProvider) {}

  public async handle(req: Request): Promise<SendChatMessageResponse> {
    const authToken = getAuthToken(req);
    const request = sendChatMessageRequest.parse(req.body);

    const chatSession = this.chatSessionProvider.tryGet(authToken.userName, request.chatName);
    if (!chatSession) {
      throw new EndpointError('Chat session not found', 404);
    }

    return {
      id: chatSession.queueUserMessage(request.message)
    };
  }
}

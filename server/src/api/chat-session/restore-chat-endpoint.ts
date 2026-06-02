import { Request, Response } from 'express';
import { Endpoint } from '../endpoint';
import { getAuthToken } from '../auth/auth-middleware';
import { ChatSessionProvider } from '../../chat-session/chat-session-provider';
import { MessageUpdate } from '../../chat-session/chat-session';
import { ChatUpdate, restoreChatRequest } from '@aila/model';
import { SseResponse } from '../../core/sse-response';

export class RestoreSessionEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat';
  public readonly auth = true;

  public constructor(private readonly chatSessionProvider: ChatSessionProvider) {}

  public async handle(req: Request, res: Response) {
    const authToken = getAuthToken(req);
    const request = restoreChatRequest.parse(req.body);

    const chatSession = this.chatSessionProvider.getOrCreate(authToken.userName, request.chatName);
    const sseResponse = new SseResponse<ChatUpdate>(res);

    function onMessageCompletedOrFailed(update: MessageUpdate) {
      sseResponse.send({ currentMessage: update });
    }

    const messages = chatSession.getAll();
    sseResponse.send({ messages });

    chatSession.onMessageCompleted.subscribe(onMessageCompletedOrFailed);
    chatSession.onMessageFailed.subscribe(onMessageCompletedOrFailed);

    sseResponse.onClose(() => {
      chatSession.onMessageCompleted.unsubscribe(onMessageCompletedOrFailed);
      chatSession.onMessageFailed.unsubscribe(onMessageCompletedOrFailed);
    });
  }
}

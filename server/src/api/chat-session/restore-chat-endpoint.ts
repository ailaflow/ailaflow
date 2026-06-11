import { Request, Response } from 'express';
import { Endpoint } from '../endpoint';
import { getAuthToken } from '../auth/auth-middleware';
import { MessageUpdate } from '../../chat-session/chat-session';
import { ChatUpdate, RestoreChatRequest, restoreChatRequest } from '@aila/model';
import { SseResponse } from '../../utilities/sse-response';
import { UserChatSessionStore } from '../../chat-session/stores/user-chat-session-store';
import { AdminChatSessionStore } from '../../chat-session/stores/admin-chat-session-store';
import { AuthToken } from '../../repositories/auth-token-repository/auth-token-repository';

export class RestoreSessionEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat';
  public readonly auth = true;

  public constructor(
    private readonly userChatSessionStore: UserChatSessionStore,
    private readonly adminChatSessionStore: AdminChatSessionStore
  ) {}

  public async handle(req: Request, res: Response) {
    const authToken = getAuthToken(req);
    const request = restoreChatRequest.parse(req.body);

    const chatSession = this.getChatSession(authToken, request);
    const sseResponse = new SseResponse<ChatUpdate>(res);

    function onMessageCompletedOrFailed(update: MessageUpdate) {
      sseResponse.send({ currentMessage: update });
    }

    const messages = chatSession.getAll();
    sseResponse.send({
      hello: {
        chatSessionId: chatSession.id
      },
      messages
    });

    chatSession.onMessageCompleted.subscribe(onMessageCompletedOrFailed);
    chatSession.onMessageFailed.subscribe(onMessageCompletedOrFailed);

    sseResponse.onClose(() => {
      chatSession.onMessageCompleted.unsubscribe(onMessageCompletedOrFailed);
      chatSession.onMessageFailed.unsubscribe(onMessageCompletedOrFailed);
    });
  }

  private getChatSession(authToken: AuthToken, request: RestoreChatRequest) {
    if (authToken.isAdmin && request.admin) {
      return (
        this.adminChatSessionStore.tryGet(authToken.userName, request.admin.hash) ??
        this.adminChatSessionStore.create(authToken.userName, request.admin.hash, request.admin.frontendToolDescriptors)
      );
    }
    if (request.user) {
      return (
        this.userChatSessionStore.tryGet(authToken.userName, request.user.channelName) ??
        this.userChatSessionStore.create(authToken.userName, request.user.channelName)
      );
    }
    throw new Error('Unsupported request');
  }
}

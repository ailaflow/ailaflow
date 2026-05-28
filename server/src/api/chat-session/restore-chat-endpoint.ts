import { Request, Response } from 'express';
import { Endpoint } from '../endpoint';
import { getAuthToken } from '../auth/auth-middleware';
import { ChatSessionProvider } from '../../chat-session/chat-session-provider';
import { MessageUpdate } from '../../chat-session/chat-session';
import { ChatUpdate, restoreChatRequest } from '@aila/model';

export class RestoreSessionEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat';
  public readonly auth = true;

  public constructor(private readonly chatSessionProvider: ChatSessionProvider) {}

  public async handle(req: Request, res: Response): Promise<void> {
    const authToken = getAuthToken(req);
    const request = restoreChatRequest.parse(req.body);

    const chatSession = this.chatSessionProvider.getOrCreate(authToken.userName, request.chatName);

    function sendUpdate(update: ChatUpdate) {
      res.write(`data: ${JSON.stringify(update)}\n\n`);
    }

    function onMessageCompletedOrFailed(update: MessageUpdate) {
      sendUpdate({ currentMessage: update });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const messages = chatSession.getAll();
    sendUpdate({ messages });

    chatSession.onMessageCompleted.subscribe(onMessageCompletedOrFailed);
    chatSession.onMessageFailed.subscribe(onMessageCompletedOrFailed);

    const pingIv = setInterval(() => {
      res.write('\n');
    }, 2_000);

    res.on('close', () => {
      chatSession.onMessageCompleted.unsubscribe(onMessageCompletedOrFailed);
      chatSession.onMessageFailed.unsubscribe(onMessageCompletedOrFailed);

      clearInterval(pingIv);
      res.end();
    });
  }
}

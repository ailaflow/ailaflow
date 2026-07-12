import type { Request, Response } from 'express';
import type { SendChatMessageResponse } from '@aibindkit/core';
import { sendChatMessageRequestSchema } from '@aibindkit/core';
import { Endpoint } from './endpoint';
import { ChatSessionProvider } from '../chat-session-provider';

export class SendChatMessageEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat/message';

  public constructor(private readonly chatSessionProvider: ChatSessionProvider) {}

  public handle(req: Request, res: Response): SendChatMessageResponse | void {
    const { data: request, error } = sendChatMessageRequestSchema.safeParse(req.body);
    if (error) {
      res.status(400).json({ error: 'Invalid request body' }).end();
      return;
    }

    const chatSession = this.chatSessionProvider.tryGet(request.chatSessionId);
    if (!chatSession) {
      res.status(404).json({ error: 'Chat session not found' }).end();
      return;
    }

    return {
      id: chatSession.queueUserMessage(request.message)
    };
  }
}

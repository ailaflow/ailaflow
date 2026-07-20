import type { Request, Response } from 'express';
import { interruptChatRequestSchema } from '@aibindkit/core';
import type { Endpoint } from './endpoint';
import { ChatSessionProvider } from '../chat-session-provider';

export class InterruptChatEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat/interrupt';

  public constructor(private readonly chatSessionProvider: ChatSessionProvider) {}

  public handle(req: Request, res: Response) {
    const { data: request, error } = interruptChatRequestSchema.safeParse(req.body);
    if (error) {
      res.status(400).json({ error: 'Invalid request body' }).end();
      return;
    }

    const chatSession = this.chatSessionProvider.tryGet(request.sessionId);
    if (!chatSession) {
      res.status(404).json({ error: 'Chat session not found' }).end();
      return;
    }

    return {
      ok: chatSession.tryInterrupt()
    };
  }
}

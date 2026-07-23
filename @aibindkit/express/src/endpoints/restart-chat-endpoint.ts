import type { Request, Response } from 'express';
import { restartChatRequestSchema } from '@aibindkit/core';
import type { Endpoint } from './endpoint';
import { ChatSessionStore } from '../chat-session-store';

export class RestartChatEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat/restart';

  public constructor(private readonly sessionStore: ChatSessionStore) {}

  public handle(req: Request, res: Response) {
    const { data: request, error } = restartChatRequestSchema.safeParse(req.body);
    if (error) {
      res.status(400).json({ error: 'Invalid request body' }).end();
      return;
    }

    const chatSession = this.sessionStore.tryGetByToken(request.sessionToken);
    if (!chatSession) {
      res.status(404).json({ error: 'Chat session not found' }).end();
      return;
    }

    chatSession.reset();
    return {
      ok: true
    };
  }
}

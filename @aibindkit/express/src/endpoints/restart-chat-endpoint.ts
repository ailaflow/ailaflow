import type { Request, Response } from 'express';
import { restartChatRequestSchema } from '@aibindkit/core';
import type { Endpoint } from './endpoint';
import { LiveChatSessionStore } from '../live-chat-session-store';

export class RestartChatEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat/restart';

  public constructor(private readonly liveChatSessionStore: LiveChatSessionStore) {}

  public async handle(req: Request, res: Response) {
    const { data: request, error } = restartChatRequestSchema.safeParse(req.body);
    if (error) {
      res.status(400).json({ error: 'Invalid request body' }).end();
      return;
    }

    const chatSession = this.liveChatSessionStore.tryGetByToken(request.sessionToken);
    if (!chatSession) {
      res.status(404).json({ error: 'Chat session not found' }).end();
      return;
    }

    await chatSession.reset();
    return {
      ok: true
    };
  }
}

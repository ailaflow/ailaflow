import type { Request, Response } from 'express';
import type { ChatUpdate } from '@aibindkit/core';
import { restoreChatRequestSchema } from '@aibindkit/core';
import type { ChatSession, ChatSessionUpdate } from '@aibindkit/llm';
import type { Endpoint } from './endpoint';
import { ChatSessionActivator } from '../chat-session-activator';
import { SseResponse } from './sse-response';
import { ChatSessionInitializerError } from '../chat-session-resolver';

export class RestoreChatEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat';

  public constructor(private readonly activator: ChatSessionActivator) {}

  public async handle(req: Request, res: Response) {
    const { data: request, error } = restoreChatRequestSchema.safeParse(req.body);
    if (error) {
      res.status(400).json({ error: 'Invalid request body' }).end();
      return;
    }

    const abortSignal = AbortSignal.timeout(3_000);
    let chatSession: ChatSession;
    try {
      chatSession = await this.activator.getOrActivate(abortSignal, req, request);
    } catch (e) {
      if (ChatSessionInitializerError.is(e)) {
        res.status(400).json({ error: e.message }).end();
        return;
      }
      throw e;
    }

    const sseResponse = new SseResponse<ChatUpdate>(res);

    function onMessageCompletedOrFailed(update: ChatSessionUpdate) {
      sseResponse.send({ currentMessage: update.update, isWorking: update.isWorking });
    }

    function onReset() {
      sseResponse.send({ isReset: true });
    }

    sseResponse.send({
      hello: {
        sessionToken: chatSession.token
      },
      restoredMessages: chatSession.getAll()
    });

    chatSession.onMessageStarted.subscribe(onMessageCompletedOrFailed);
    chatSession.onMessageCompleted.subscribe(onMessageCompletedOrFailed);
    chatSession.onMessageFailed.subscribe(onMessageCompletedOrFailed);
    chatSession.onReset.subscribe(onReset);

    sseResponse.onClose(() => {
      chatSession.onMessageStarted.unsubscribe(onMessageCompletedOrFailed);
      chatSession.onMessageCompleted.unsubscribe(onMessageCompletedOrFailed);
      chatSession.onMessageFailed.unsubscribe(onMessageCompletedOrFailed);
      chatSession.onReset.unsubscribe(onReset);
    });
  }
}

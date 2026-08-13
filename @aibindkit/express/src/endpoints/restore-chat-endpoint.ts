import type { Request, Response } from 'express';
import type { ChatUpdate } from '@aibindkit/core';
import { restoreChatRequestSchema } from '@aibindkit/core';
import type { ChatSession, ChatSessionUpdate } from '@aibindkit/llm';
import type { Endpoint } from './endpoint';
import { ChatSessionActivator } from '../chat-session-activator';
import { SseResponse } from './sse-response';
import { ChatSessionInitializerError } from '../chat-session-resolver';
import { ChatAuthContext, ChatAuthContextResolver } from '../chat-auth-context-resolver';

export class RestoreChatEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat';

  public constructor(
    private readonly authContextResolver: ChatAuthContextResolver,
    private readonly activator: ChatSessionActivator
  ) {}

  public async handle(req: Request, res: Response) {
    const { data: request, error } = restoreChatRequestSchema.safeParse(req.body);
    if (error) {
      res.status(400).json({ error: 'Invalid request body' }).end();
      return;
    }

    const abortSignal = AbortSignal.timeout(3_000);

    let authContext: ChatAuthContext;
    try {
      authContext = this.authContextResolver.resolve(req);
    } catch (e) {
      res.status(401).json({ error: 'Unauthorized' }).end();
      return;
    }

    let session: ChatSession;
    try {
      session = await this.activator.getOrActivate(
        abortSignal,
        request.frontendTools,
        request.frontendToolsHash,
        request.channelName,
        authContext
      );
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

    function onDestroyed() {
      sseResponse.end();
    }

    sseResponse.send({
      sessionToken: session.token,
      restoredMessages: session.getAll()
    });

    session.onMessageStarted.subscribe(onMessageCompletedOrFailed);
    session.onMessageCompleted.subscribe(onMessageCompletedOrFailed);
    session.onMessageFailed.subscribe(onMessageCompletedOrFailed);
    session.onReset.subscribe(onReset);
    session.onDestroyed.subscribe(onDestroyed);

    sseResponse.onClose(() => {
      session.onMessageStarted.unsubscribe(onMessageCompletedOrFailed);
      session.onMessageCompleted.unsubscribe(onMessageCompletedOrFailed);
      session.onMessageFailed.unsubscribe(onMessageCompletedOrFailed);
      session.onReset.unsubscribe(onReset);
    });
  }
}

import type { Request } from 'express';
import type { RestoreChatRequest } from '@aibindkit/core';
import { ChatSession, ChatSessionFactory, FrontendToolFactory, ToolSet } from '@aibindkit/llm';
import type { ChatSessionResolver } from './chat-session-resolver';
import { ChatSessionStore } from './chat-session-store';

export class ChatSessionActivator {
  public constructor(
    private readonly sessionStore: ChatSessionStore,
    private readonly sessionResolver: ChatSessionResolver,
    private readonly chatSessionFactory: ChatSessionFactory,
    private readonly frontendToolFactory: FrontendToolFactory
  ) {}

  public getOrActivate(httpRequest: Request, restoreRequest: RestoreChatRequest): ChatSession {
    const resolved = this.sessionResolver.resolve(httpRequest, restoreRequest.params);
    const hash = resolved.backendToolsHash.concat(restoreRequest.frontendToolsHash);

    let session = this.sessionStore.tryGetById(resolved.sessionId);
    if (session && session.hash === hash) {
      return session;
    }

    const toolSet = new ToolSet();
    for (const descriptor of restoreRequest.frontendTools) {
      toolSet.addTool(this.frontendToolFactory.create(descriptor));
    }
    for (const tool of resolved.backendTools) {
      toolSet.addTool(tool);
    }

    session = this.chatSessionFactory.create(resolved.sessionId, hash, resolved.llmClient, toolSet);
    this.sessionStore.set(session);
    resolved.activate(session);
    return session;
  }
}

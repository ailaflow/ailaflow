import type { Request } from 'express';
import type { RestoreChatRequest } from '@aibindkit/core';
import { ChatSession, ChatSessionFactory, FrontendToolFactory, ToolSet } from '@aibindkit/llm';
import type { ChatSessionResolver } from './chat-session-resolver';

export class ChatSessionProvider {
  private readonly sessionsById = new Map<string, ChatSession>();
  private readonly sessionsByToken = new Map<string, ChatSession>();

  public constructor(
    private readonly sessionResolver: ChatSessionResolver,
    private readonly chatSessionFactory: ChatSessionFactory,
    private readonly frontendToolFactory: FrontendToolFactory
  ) {}

  public tryGetByToken(token: string): ChatSession | undefined {
    return this.sessionsByToken.get(token);
  }

  public getOrCreate(httpRequest: Request, restoreRequest: RestoreChatRequest): ChatSession {
    const resolved = this.sessionResolver.resolve(httpRequest, restoreRequest.params);
    const hash = resolved.backendToolsHash.concat(restoreRequest.frontendToolsHash);

    let session = this.sessionsById.get(resolved.sessionId);
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
    this.sessionsById.set(session.id, session);
    this.sessionsByToken.set(session.token, session);
    resolved.initialize(session);
    return session;
  }
}

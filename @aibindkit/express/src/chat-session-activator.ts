import type { Request } from 'express';
import type { RestoreChatRequest } from '@aibindkit/core';
import { ChatSession, ChatSessionFactory, ChatSessionItem, ChatSessionStorage, FrontendToolFactory, ToolSet } from '@aibindkit/llm';
import type { ChatSessionResolver } from './chat-session-resolver';
import { LiveChatSessionStore } from './live-chat-session-store';

export class ChatSessionActivator {
  public constructor(
    private readonly liveSessionStore: LiveChatSessionStore,
    private readonly sessionResolver: ChatSessionResolver,
    private readonly sessionStorage: ChatSessionStorage,
    private readonly chatSessionFactory: ChatSessionFactory,
    private readonly frontendToolFactory: FrontendToolFactory
  ) {}

  public async getOrActivate(abortSignal: AbortSignal, httpRequest: Request, restoreRequest: RestoreChatRequest): Promise<ChatSession> {
    const resolved = this.sessionResolver.resolve(httpRequest, restoreRequest.params);
    const toolsHash = resolved.backendToolsHash.concat(restoreRequest.frontendToolsHash);

    let session = this.liveSessionStore.tryGetById(resolved.sessionId);
    let items: ReadonlyArray<ChatSessionItem> | null = null;
    if (session) {
      if (session.toolsHash === toolsHash) {
        return session;
      }
      items = session.dump();
    }

    const toolSet = new ToolSet();
    for (const descriptor of restoreRequest.frontendTools) {
      toolSet.addTool(this.frontendToolFactory.create(descriptor));
    }
    for (const tool of resolved.backendTools) {
      toolSet.addTool(tool);
    }

    if (!items) {
      items = await this.sessionStorage.tryGet(abortSignal, resolved.sessionId);
    }

    session = this.chatSessionFactory.create(resolved.sessionId, toolsHash, resolved.llmClient, toolSet);
    if (resolved.systemPrompt) {
      session.setSystemMessage(resolved.systemPrompt);
    }
    if (items) {
      session.load(items);
    }

    this.liveSessionStore.set(session);
    return session;
  }
}

import type { ChatMessage, ToolDescriptor } from '@aibindkit/core';
import { ChatSession, ChatSessionFactory, ChatSessionStorage, FrontendToolFactory, ToolSet } from '@aibindkit/llm';
import type { ChatSessionResolver } from './chat-session-resolver';
import { LiveChatSessionStore } from './live-chat-session-store';
import { ChatAuthContext } from './chat-auth-context-resolver';

export class ChatSessionActivator {
  public constructor(
    private readonly liveSessionStore: LiveChatSessionStore,
    private readonly sessionResolver: ChatSessionResolver,
    private readonly sessionStorage: ChatSessionStorage,
    private readonly chatSessionFactory: ChatSessionFactory,
    private readonly frontendToolFactory: FrontendToolFactory
  ) {}

  /**
   * @throws {ChatSessionInitializerError} if the session cannot be initialized
   */
  public async getOrActivate(
    abortSignal: AbortSignal,
    frontendTools: ToolDescriptor[],
    frontendToolsHash: string,
    sessionKey: string,
    authContext: ChatAuthContext
  ): Promise<ChatSession> {
    const resolved = this.sessionResolver.resolve(sessionKey, authContext);
    const toolsHash = resolved.backendToolsHash.concat(frontendToolsHash);

    let session = this.liveSessionStore.tryGetById(resolved.sessionId);
    let messages: ReadonlyArray<ChatMessage> | null = null;
    if (session) {
      if (session.toolsHash === toolsHash) {
        return session;
      }
      messages = session.dump();
      session.destroy();
    }

    const llm = await resolved.getLlmClientWithSettings(abortSignal);
    const toolSet = new ToolSet();
    for (const descriptor of frontendTools) {
      toolSet.addTool(this.frontendToolFactory.create(descriptor));
    }
    for (const tool of resolved.backendTools) {
      toolSet.addTool(tool);
    }

    if (!messages) {
      messages = await this.sessionStorage.tryGet(abortSignal, resolved.sessionId);
    }

    session = this.chatSessionFactory.create(resolved.sessionId, toolsHash, llm.client, llm.modelSettings, toolSet);
    if (resolved.systemPrompt) {
      session.setSystemMessage(resolved.systemPrompt);
    }
    if (messages && messages.length > 0) {
      session.load(messages);
    }

    this.liveSessionStore.set(session);
    return session;
  }
}

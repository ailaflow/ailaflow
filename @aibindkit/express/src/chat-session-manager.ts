import { ChatSession } from '@aibindkit/llm';
import { ChatAuthContext } from './chat-auth-context-resolver';
import { ChatSessionActivator } from './chat-session-activator';
import { fnv1a, ToolDescriptor } from '@aibindkit/core';
import { LiveChatSessionStore } from './live-chat-session-store';

interface Services {
  liveChatSessionStore: LiveChatSessionStore;
  chatSessionActivator: ChatSessionActivator;
}

export class ChatSessionManager {
  private services: Services | null = null;

  private getServices(): Services {
    if (!this.services) {
      throw new Error('Not initialized');
    }
    return this.services;
  }

  public getOrActivate(abortSignal: AbortSignal, sessionKey: string, authContext: ChatAuthContext): Promise<ChatSession> {
    const frontendTools: ToolDescriptor[] = [];
    const frontendToolsHash = fnv1a(frontendTools);
    return this.getServices().chatSessionActivator.getOrActivate(abortSignal, frontendTools, frontendToolsHash, sessionKey, authContext);
  }

  public tryGetByToken(token: string): ChatSession | undefined {
    return this.getServices().liveChatSessionStore.tryGetByToken(token);
  }

  public flushAll() {
    return this.getServices().liveChatSessionStore.flushAll();
  }

  public initialize(services: Services) {
    this.services = services;
  }

  public isInitialized(): boolean {
    return this.services !== null;
  }
}

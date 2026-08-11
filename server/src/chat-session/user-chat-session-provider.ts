import { LiveChatSessionStore } from '@aibindkit/express';
import { ChatSession } from '@aibindkit/llm';
import { ChatSessionId } from './chat-session-id';

export class UserChatSessionProvider {
  public constructor(private readonly liveSessionStore: LiveChatSessionStore) {}

  public tryGetMainChannel(userName: string): ChatSession | undefined {
    const sessionId = ChatSessionId.createUserMainChannel(userName).encode();
    return this.liveSessionStore.tryGetById(sessionId);
  }
}

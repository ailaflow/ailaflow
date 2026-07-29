import { LiveChatSessionStore } from '@aibindkit/express';
import { ChatSessionId } from '../chat-session/chat-session-id';
import { ChatSession } from '@aibindkit/llm';

export class UserChatSessionProvider {
  public constructor(private readonly liveSessionStore: LiveChatSessionStore) {}

  public tryGetMainChannel(userName: string): ChatSession | undefined {
    const sessionId = ChatSessionId.createUserMainChannel(userName).encode();
    return this.liveSessionStore.tryGetById(sessionId);
  }
}

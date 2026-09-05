import { ChatSessionManager } from '@aibindkit/express';
import { ChatSession } from '@aibindkit/llm';
import { ChatSessionId } from './chat-session-id';

export class AdminChatSessionProvider {
  public constructor(private readonly chatSessionManager: ChatSessionManager) {}

  public tryGet(userName: string): ChatSession | undefined {
    const sessionId = ChatSessionId.createAdmin(userName).encode();
    // We cannot use `getOrActivate` here because the admin session requires front end tools that are not available in the backend.
    // That's why we can restore only a session that was created by the front end and is still active.
    return this.chatSessionManager.tryGetById(sessionId);
  }
}

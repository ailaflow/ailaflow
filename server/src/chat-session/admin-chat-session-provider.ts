import { ChatAuthContext } from '@aibindkit/express';
import { ChatSessionManager } from '@aibindkit/express';
import { ChatSession } from '@aibindkit/llm';

export class AdminChatSessionProvider {
  public constructor(private readonly chatSessionManager: ChatSessionManager) {}

  public get(abortSignal: AbortSignal, userName: string): Promise<ChatSession> {
    const authContext: ChatAuthContext = {
      userName,
      isAdmin: true
    };
    const sessionKey = 'admin:*';
    return this.chatSessionManager.getOrActivate(abortSignal, sessionKey, authContext);
  }
}

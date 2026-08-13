import { ChatSessionManager } from '@aibindkit/express';
import { ChatSession } from '@aibindkit/llm';

export class UserChatSessionProvider {
  public constructor(private readonly chatSessionManager: ChatSessionManager) {}

  public getDefault(abortSignal: AbortSignal, userName: string): Promise<ChatSession> {
    return this.chatSessionManager.getOrActivate(abortSignal, 'default', {
      userName
    });
  }
}

import { ChatAuthContext, ChatSessionManager } from '@aibindkit/express';
import { ChatSession } from '@aibindkit/llm';

export class UserChatSessionProvider {
  public constructor(private readonly chatSessionManager: ChatSessionManager) {}

  public getDefaultChannelName(): string {
    return 'default';
  }

  public get(abortSignal: AbortSignal, isTest: boolean, userName: string, channelName: string): Promise<ChatSession> {
    const authContext: ChatAuthContext = {
      userName,
      isAdmin: isTest
    };
    const sessionKey = isTest ? `test:${userName}:${channelName}` : `user:${channelName}`;
    return this.chatSessionManager.getOrActivate(abortSignal, sessionKey, authContext);
  }
}

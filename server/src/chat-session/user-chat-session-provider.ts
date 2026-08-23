import { ChatAuthContext, ChatSessionManager } from '@aibindkit/express';
import { ChatSession } from '@aibindkit/llm';

export class UserChatSessionProvider {
  public constructor(private readonly chatSessionManager: ChatSessionManager) {}

  public getDefaultChannelName(): string {
    return 'default';
  }

  public get(abortSignal: AbortSignal, userName: string, channelName: string): Promise<ChatSession> {
    const authContext: ChatAuthContext = {
      userName,
      isAdmin: false
    };
    return this.chatSessionManager.getOrActivate(abortSignal, channelName, authContext);
  }
}

import { ChatSession, ChatSessionFactory, LlmClient } from '@aibindkit/llm';
import { UserToolSetProvider } from './user-tool-set-provider';
import { ChatSessionStore } from './chat-session-store';

const SYSTEM_PROMPT = 'You are Aila, an AI assistant.';

export class UserChatSessionStore {
  public constructor(
    private readonly store: ChatSessionStore,
    private readonly chatSessionFactory: ChatSessionFactory,
    private readonly llmClient: LlmClient,
    private readonly userToolSetProvider: UserToolSetProvider
  ) {}

  public tryGet(userName: string, channelName: string): ChatSession | undefined {
    return this.store.tryGetWithHashCheck(userName, buildId(channelName), this.userToolSetProvider.hash);
  }

  public create(userName: string, channelName: string): ChatSession {
    const id = buildId(channelName);

    const session = this.chatSessionFactory.create(id, this.userToolSetProvider.hash, this.llmClient, this.userToolSetProvider.toolSet);
    session.pushSystemMessage(SYSTEM_PROMPT);

    this.store.set(userName, session);
    return session;
  }
}

function buildId(channelName: string): string {
  return `channel:${channelName}`;
}

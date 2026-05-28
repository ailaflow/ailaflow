import { ChatSession, ChatSessionFactory } from './chat-session';

export class ChatSessionProvider {
  private readonly sessions = new Map<string, ChatSession>();

  public constructor(private readonly chatSessionFactory: ChatSessionFactory) {}

  public getOrCreate(userName: string, chatName: string): ChatSession {
    const key = buildKey(userName, chatName);
    let session = this.sessions.get(key);
    if (!session) {
      session = this.chatSessionFactory.create();
      this.sessions.set(key, session);
    }
    return session;
  }

  public tryGet(userName: string, chatName: string): ChatSession | undefined {
    const key = buildKey(userName, chatName);
    return this.sessions.get(key);
  }
}

function buildKey(userName: string, chatName: string): string {
  return `${userName}:${chatName}`;
}

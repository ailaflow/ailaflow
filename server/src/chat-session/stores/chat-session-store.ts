import { ChatSession } from '../chat-session';

export class ChatSessionStore {
  private readonly sessions = new Map<string, ChatSession>();

  public tryGetWithHashCheck(userName: string, id: string, hash: string): ChatSession | undefined {
    const item = this.sessions.get(createKey(userName, id));
    if (item && item.hash === hash) {
      return item;
    }
    return undefined;
  }

  public tryGet(userName: string, id: string): ChatSession | undefined {
    return this.sessions.get(createKey(userName, id));
  }

  public set(userName: string, session: ChatSession) {
    this.sessions.set(createKey(userName, session.id), session);
  }
}

function createKey(userName: string, id: string): string {
  return `${userName}:${id}`;
}

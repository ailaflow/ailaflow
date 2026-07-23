import { ChatSession } from '@aibindkit/llm';
import { ChatSessionStore } from './chat-session-store';

export class DefaultChatSessionStore implements ChatSessionStore {
  private readonly sessionsById = new Map<string, ChatSession>();
  private readonly sessionsByToken = new Map<string, ChatSession>();

  public tryGetById(id: string): ChatSession | undefined {
    return this.sessionsById.get(id);
  }

  public tryGetByToken(token: string): ChatSession | undefined {
    return this.sessionsByToken.get(token);
  }

  public set(session: ChatSession) {
    this.sessionsById.set(session.id, session);
    this.sessionsByToken.set(session.token, session);
  }

  public tryDelete(session: ChatSession) {
    const i = this.sessionsById.delete(session.id);
    const t = this.sessionsByToken.delete(session.token);
    return i || t;
  }
}

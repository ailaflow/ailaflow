import { ChatSession } from '@aibindkit/llm';

export interface ChatSessionStore {
  tryGetById(id: string): ChatSession | undefined;
  tryGetByToken(token: string): ChatSession | undefined;
  set(session: ChatSession): void;
  tryDelete(session: ChatSession): boolean;
}

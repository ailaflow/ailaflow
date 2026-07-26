import { ChatSessionItem } from './chat-session-item';

export interface ChatSessionStorage {
  save(abortSignal: AbortSignal, sessionId: string, items: ReadonlyArray<ChatSessionItem>): Promise<void>;
  tryGet(abortSignal: AbortSignal, sessionId: string): Promise<ChatSessionItem[] | null>;
}

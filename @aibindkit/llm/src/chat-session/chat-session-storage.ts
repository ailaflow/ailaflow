import { ChatSessionSnapshot } from './chat-session';

export interface ChatSessionStorage {
  save(abortSignal: AbortSignal, sessionId: string, data: ChatSessionSnapshot): Promise<void>;
  tryGet(abortSignal: AbortSignal, sessionId: string): Promise<ChatSessionSnapshot | null>;
}

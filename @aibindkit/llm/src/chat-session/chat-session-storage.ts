import { ChatSessionSnapshot } from './chat-session';

export interface ChatSessionStorage {
  save(signal: AbortSignal, sessionId: string, data: ChatSessionSnapshot): Promise<void>;
  tryGet(signal: AbortSignal, sessionId: string): Promise<ChatSessionSnapshot | null>;
}

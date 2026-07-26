import { ChatMessage } from '@aibindkit/core';

export interface ChatSessionStorage {
  save(abortSignal: AbortSignal, sessionId: string, items: ReadonlyArray<ChatMessage>): Promise<void>;
  tryGet(abortSignal: AbortSignal, sessionId: string): Promise<ChatMessage[] | null>;
}

import { ChatMessage } from '@aibindkit/core';
import { Repository } from '../repository';

export interface ChatSessionRepository extends Repository {
  upsert(abortSignal: AbortSignal, sessionId: string, messages: ReadonlyArray<ChatMessage>): Promise<void>;
  tryGet(abortSignal: AbortSignal, sessionId: string): Promise<ChatMessage[] | null>;
}

import { ChatSessionItem } from '@aibindkit/llm';
import { Repository } from '../repository';

export interface ChatSessionRepository extends Repository {
  upsert(abortSignal: AbortSignal, sessionId: string, items: ReadonlyArray<ChatSessionItem>): Promise<void>;
  tryGet(abortSignal: AbortSignal, sessionId: string): Promise<ChatSessionItem[] | null>;
}

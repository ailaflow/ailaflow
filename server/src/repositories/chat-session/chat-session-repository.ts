import { Repository } from '../repository';
import { ChatSessionSnapshot } from '@aibindkit/llm';

export interface ChatSessionRepository extends Repository {
  upsert(abortSignal: AbortSignal, sessionId: string, snapshot: ChatSessionSnapshot): Promise<void>;
  tryGet(abortSignal: AbortSignal, sessionId: string): Promise<ChatSessionSnapshot | null>;
}

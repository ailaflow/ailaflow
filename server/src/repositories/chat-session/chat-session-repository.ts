import { Repository } from '../repository';
import { ChatSessionSnapshot } from '@aibindkit/llm';
import { Transaction } from '../../core/transaction';

export interface ChatSessionRepository extends Repository {
  upsert(abortSignal: AbortSignal, sessionId: string, snapshot: ChatSessionSnapshot, transaction?: Transaction): Promise<void>;
  tryGet(abortSignal: AbortSignal, sessionId: string): Promise<ChatSessionSnapshot | null>;
}

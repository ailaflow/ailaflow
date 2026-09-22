import { Repository } from '../repository';
import { ChatSessionSnapshot } from '@aibindkit/llm';
import { Transaction } from '../../core/transaction';

export interface ChatSessionRepository extends Repository {
  upsert(signal: AbortSignal, sessionId: string, snapshot: ChatSessionSnapshot, transaction?: Transaction): Promise<void>;
  tryGet(signal: AbortSignal, sessionId: string): Promise<ChatSessionSnapshot | null>;
}

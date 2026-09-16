import { Repository } from '../../repository';
import { SlackInboundEvent } from './slack-types';

export interface SlackInboundEventRepository extends Repository {
  tryInsert(abortSignal: AbortSignal, event: SlackInboundEvent): Promise<boolean>;
  getPending(abortSignal: AbortSignal, now: number, limit: number): Promise<SlackInboundEvent[]>;
  markProcessed(abortSignal: AbortSignal, eventId: string, processedAt: number): Promise<void>;
  markFailed(abortSignal: AbortSignal, eventId: string, nextAttemptAt: number, error: string): Promise<void>;
  deleteOldProcessed(abortSignal: AbortSignal, before: number): Promise<number>;
}

import { Repository } from '../../repository';
import { SlackInboundEvent } from './slack-types';

export interface SlackInboundEventRepository extends Repository {
  tryInsert(signal: AbortSignal, event: SlackInboundEvent): Promise<boolean>;
  getPending(signal: AbortSignal, now: number, limit: number): Promise<SlackInboundEvent[]>;
  markProcessed(signal: AbortSignal, eventId: string, processedAt: number): Promise<void>;
  markFailed(signal: AbortSignal, eventId: string, nextAttemptAt: number, error: string): Promise<void>;
  deleteOldProcessed(signal: AbortSignal, before: number): Promise<number>;
}

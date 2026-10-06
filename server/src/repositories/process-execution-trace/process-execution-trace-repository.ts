import { Repository } from '../repository';
import { ProcessExecutionTrace } from './process-execution-trace';

export interface ProcessExecutionTraceRepository extends Repository {
  tryGet(signal: AbortSignal, executionId: string): Promise<ProcessExecutionTrace | null>;
  upsert(signal: AbortSignal, trace: ProcessExecutionTrace): Promise<void>;
  deleteOldWithAllEvents(signal: AbortSignal, now: number): Promise<number>;
  getPage(signal: AbortSignal, offset: number, limit: number, processName?: string): Promise<ProcessExecutionTrace[]>;
  count(signal: AbortSignal, processName?: string): Promise<number>;
}

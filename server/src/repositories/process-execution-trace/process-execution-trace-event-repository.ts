import { Repository } from '../repository';
import { ProcessExecutionTraceEvent } from './process-execution-trace-event';

export interface ProcessExecutionTraceEventRepository extends Repository {
  insert(signal: AbortSignal, event: ProcessExecutionTraceEvent): Promise<void>;
  getAll(signal: AbortSignal, executionId: string): Promise<ProcessExecutionTraceEvent[]>;
}

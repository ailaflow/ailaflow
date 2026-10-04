import { Repository } from '../repository';
import { PersistedExecution } from './persisted-execution';
import { Transaction } from '../../core/transaction';

export interface PersistedExecutionRepository extends Repository {
  upsert(signal: AbortSignal, execution: PersistedExecution, transaction?: Transaction): Promise<void>;
  tryGet(signal: AbortSignal, executionId: string): Promise<PersistedExecution | null>;
  delete(signal: AbortSignal, executionId: string, transaction?: Transaction): Promise<void>;
  countProcessHashes(signal: AbortSignal, processName: string, processHash: string): Promise<number>;
}

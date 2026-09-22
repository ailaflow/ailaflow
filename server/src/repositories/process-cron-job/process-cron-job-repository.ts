import { ProcessCronJobRun } from '@ailaflow/shared';
import { Transaction } from '../../core/transaction';
import { Repository } from '../repository';
import { ProcessCronJob } from './process-cron-job';

export class ProcessCronJobRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = ProcessCronJobRepositoryError.name;
  }
}

export interface ProcessCronJobRepository extends Repository {
  insert(signal: AbortSignal, job: ProcessCronJob, transaction?: Transaction): Promise<void>;
  updateConfiguration(signal: AbortSignal, job: ProcessCronJob, transaction?: Transaction): Promise<void>;
  updateLastRun(signal: AbortSignal, id: string, lastRun: ProcessCronJobRun, transaction?: Transaction): Promise<boolean>;
  delete(signal: AbortSignal, id: string, transaction?: Transaction): Promise<boolean>;
  tryGet(signal: AbortSignal, id: string): Promise<ProcessCronJob | null>;
  getByProcessName(signal: AbortSignal, processName: string): Promise<ProcessCronJob[]>;
  getDue(signal: AbortSignal, now: number, limit: number): Promise<ProcessCronJob[]>;
  tryAdvanceNextExecutionAt(
    signal: AbortSignal,
    id: string,
    expectedNextExecutionAt: number,
    nextExecutionAt: number,
    transaction?: Transaction
  ): Promise<boolean>;
}

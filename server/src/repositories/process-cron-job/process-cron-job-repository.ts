import { ProcessCronJobRun } from '@ailaflow/shared';
import { Repository } from '../repository';
import { ProcessCronJob } from './process-cron-job';

export class ProcessCronJobRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = ProcessCronJobRepositoryError.name;
  }
}

export interface ProcessCronJobRepository extends Repository {
  insert(abortSignal: AbortSignal, job: ProcessCronJob): Promise<void>;
  updateConfiguration(abortSignal: AbortSignal, job: ProcessCronJob): Promise<void>;
  updateLastRun(abortSignal: AbortSignal, id: string, lastRun: ProcessCronJobRun): Promise<boolean>;
  delete(abortSignal: AbortSignal, id: string): Promise<boolean>;
  tryGet(abortSignal: AbortSignal, id: string): Promise<ProcessCronJob | null>;
  getByProcessName(abortSignal: AbortSignal, processName: string): Promise<ProcessCronJob[]>;
  getDue(abortSignal: AbortSignal, now: number, limit: number): Promise<ProcessCronJob[]>;
  tryAdvanceNextExecutionAt(
    abortSignal: AbortSignal,
    id: string,
    expectedNextExecutionAt: number,
    nextExecutionAt: number
  ): Promise<boolean>;
}

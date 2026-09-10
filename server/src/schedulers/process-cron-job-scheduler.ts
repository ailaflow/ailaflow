import { ProcessCronJobRunStatus } from '@ailaflow/model';
import { Logger } from '../core/logger';
import { ProcessCronJobExpressionParser } from '../crons/process-cron-job-expression-parser';
import { ProcessCronJob } from '../repositories/process-cron-job/process-cron-job';
import { ProcessCronJobRepository } from '../repositories/process-cron-job/process-cron-job-repository';
import { Scheduler } from './scheduler';
import { LazyProcessExecutor } from '../process-executor/lazy-process-executor';
import { ProcessManager } from '../process/process-manager';

const INTERVAL_MS = 60_000;
const BATCH_SIZE = 100;

export class ProcessCronJobScheduler implements Scheduler {
  private readonly logger = new Logger(ProcessCronJobScheduler.name);
  private interval?: ReturnType<typeof setInterval>;
  private isWorking = false;

  public constructor(
    private readonly repository: ProcessCronJobRepository,
    private readonly processManager: ProcessManager,
    private readonly lazyProcessExecutor: LazyProcessExecutor
  ) {}

  public start(): void {
    this.interval = setInterval(this.handle, INTERVAL_MS);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private handle = async (): Promise<void> => {
    if (this.isWorking) {
      return;
    }

    const now = Date.now();
    this.isWorking = true;
    try {
      const abortSignal = AbortSignal.timeout(50_000);
      const jobs = await this.repository.getDue(abortSignal, now, BATCH_SIZE);
      for (const job of jobs) {
        await this.handleJob(abortSignal, job, now);
      }
    } catch (e) {
      const error = (e as Error)?.message ?? String(e);
      this.logger.error(`Failed to handle process cron jobs: ${error}`);
    } finally {
      this.isWorking = false;
    }
  };

  private async handleJob(abortSignal: AbortSignal, job: ProcessCronJob, now: number): Promise<void> {
    const updater = new LastRunUpdater(this.repository, job.id);
    try {
      const nextExecutionAt = ProcessCronJobExpressionParser.getNextExecutionAt(job.expression, job.timeZone, now);
      const claimed = await this.repository.tryAdvanceNextExecutionAt(abortSignal, job.id, job.nextExecutionAt, nextExecutionAt);
      if (claimed) {
        updater.update(ProcessCronJobRunStatus.RUNNING, null);
        await this.handleProcess(abortSignal, job, updater);
        updater.update(ProcessCronJobRunStatus.SUCCEEDED, null);
      }
    } catch (e) {
      const error = (e as Error)?.message ?? String(e);
      this.logger.error(`Failed to handle process cron job ${job.id}: ${error}`);
      updater.update(ProcessCronJobRunStatus.FAILED, error);
    }
  }

  private async handleProcess(abortSignal: AbortSignal, job: ProcessCronJob, updater: LastRunUpdater): Promise<void> {
    const process = await this.processManager.tryGetByName(abortSignal, job.processName);
    if (!process) {
      throw new Error(`Process ${job.processName} not found`);
    }

    await this.lazyProcessExecutor.execute(
      abortSignal,
      null,
      {
        isTest: false,
        startedBy: '_system'
      },
      process,
      job.inputValues
    );
  }
}

class LastRunUpdater {
  private readonly startedAt = Date.now();

  public constructor(
    private readonly repository: ProcessCronJobRepository,
    private readonly jobId: string
  ) {}

  public update(status: ProcessCronJobRunStatus, error: string | null) {
    const abortSignal = AbortSignal.timeout(5_000);
    const isFinished = status === ProcessCronJobRunStatus.SUCCEEDED || status === ProcessCronJobRunStatus.FAILED;
    this.repository
      .updateLastRun(abortSignal, this.jobId, {
        status,
        error,
        executionId: '',
        startedAt: this.startedAt,
        finishedAt: isFinished ? Date.now() : null
      })
      .catch(() => {
        // TODO
      });
  }
}

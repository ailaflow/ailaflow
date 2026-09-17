import { ProcessCronJobRunStatus, ProcessExecutionOutcomeType } from '@ailaflow/shared';
import { Logger } from '../core/logger';
import { ProcessCronJobExpressionParser } from '../crons/process-cron-job-expression-parser';
import { ProcessCronJob } from '../repositories/process-cron-job/process-cron-job';
import { ProcessCronJobRepository } from '../repositories/process-cron-job/process-cron-job-repository';
import { Scheduler } from './scheduler';
import { ProcessManager } from '../process/process-manager';
import { ProcessExecutor } from '../process-executor/process-executor';
import { ProcessExecutionContext } from '../process-executor/process-execution-context';

const INTERVAL_MS = 60_000;
const BATCH_SIZE = 100;

export class ProcessCronJobScheduler implements Scheduler {
  private readonly logger = new Logger(ProcessCronJobScheduler.name);
  private interval?: ReturnType<typeof setInterval>;
  private isWorking = false;

  public constructor(
    private readonly repository: ProcessCronJobRepository,
    private readonly processManager: ProcessManager,
    private readonly processExecutor: ProcessExecutor
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
      const getSignal = AbortSignal.timeout(5_000);
      const jobs = await this.repository.getDue(getSignal, now, BATCH_SIZE);

      for (const job of jobs) {
        const jobSignal = AbortSignal.timeout(60_000);
        await this.handleJob(jobSignal, job, now);
      }
    } catch (e) {
      const error = (e as Error)?.message ?? String(e);
      this.logger.error(`Failed to handle process cron jobs: ${error}`);
    } finally {
      this.isWorking = false;
    }
  };

  private async handleJob(jobSignal: AbortSignal, job: ProcessCronJob, now: number): Promise<void> {
    const updater = new LastRunUpdater(this.repository, job.id);
    try {
      const nextExecutionAt = ProcessCronJobExpressionParser.getNextExecutionAt(job.expression, job.timeZone, now);

      const claimSignal = AbortSignal.any([jobSignal, AbortSignal.timeout(4_000)]);
      const claimed = await this.repository.tryAdvanceNextExecutionAt(claimSignal, job.id, job.nextExecutionAt, nextExecutionAt);

      if (claimed) {
        updater.update(ProcessCronJobRunStatus.RUNNING, null);
        await this.handleProcess(jobSignal, job);
        updater.update(ProcessCronJobRunStatus.SUCCEEDED, null);
      }
    } catch (e) {
      const error = (e as Error)?.message ?? String(e);
      this.logger.error(`Failed to handle process cron job ${job.id}: ${error}`);
      updater.update(ProcessCronJobRunStatus.FAILED, error);
    }
  }

  private async handleProcess(jobSignal: AbortSignal, job: ProcessCronJob) {
    const processSignal = AbortSignal.any([jobSignal, AbortSignal.timeout(4_000)]);
    const process = await this.processManager.tryGetByName(processSignal, job.processName);
    if (!process) {
      throw new Error(`Process ${job.processName} not found`);
    }

    const context: ProcessExecutionContext = {
      isTest: false,
      startedBy: '_system'
    };

    return new Promise<unknown>((resolve, reject) => {
      const execution = this.processExecutor.initialize(context, process, job.inputValues);

      jobSignal.addEventListener('abort', () => execution.tryStop(), {
        once: true
      });

      execution.onOutcome.subscribe(outcome => {
        if (outcome.type === ProcessExecutionOutcomeType.FAILED) {
          reject(new Error(outcome.error));
        } else {
          resolve(outcome);
        }
      });
      execution.run();
    });
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

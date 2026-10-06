import { Logger } from '../core/logger';
import { ProcessExecutionTraceRepository } from '../repositories/process-execution-trace/process-execution-trace-repository';
import { Scheduler } from './scheduler';

const INTERVAL_MS = 10 * 60 * 1_000;

export class ProcessExecutionTraceJobScheduler implements Scheduler {
  private readonly logger = new Logger(ProcessExecutionTraceJobScheduler.name);
  private interval: ReturnType<typeof setInterval> | null = null;

  public constructor(private readonly repository: ProcessExecutionTraceRepository) {}

  public start(): void {
    if (this.interval) {
      throw new Error('Scheduler already started');
    }
    const cleanup = async () => {
      try {
        const count = await this.repository.deleteOldWithAllEvents(new AbortController().signal, Date.now());
        if (count > 0) {
          this.logger.log(`Deleted ${count} old execution traces.`);
        }
      } catch (e) {
        this.logger.warn(`Failed to delete old execution traces: ${(e as Error)?.message ?? e}`);
      }
    };
    this.interval = setInterval(cleanup, INTERVAL_MS);
    cleanup();
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

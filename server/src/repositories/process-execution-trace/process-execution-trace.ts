import {
  ProcessExecutionTraceDto,
  ProcessExecutionTraceRetention,
  ProcessExecutionTraceStatus,
  ProcessExecutionTrigger
} from '@ailaflow/shared';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';

export class ProcessExecutionTrace {
  public static createOrResume(
    executionId: string,
    processName: string,
    retention: ProcessExecutionTraceRetention,
    isResumed: boolean,
    context: ProcessExecutionContext
  ) {
    return new ProcessExecutionTrace(
      executionId,
      context.trigger,
      isResumed ? ProcessExecutionTraceStatus.PAUSED : ProcessExecutionTraceStatus.RUNNING,
      processName,
      retention,
      context.startedBy,
      Date.now(),
      null,
      null,
      null
    );
  }

  public constructor(
    public readonly executionId: string,
    public readonly trigger: ProcessExecutionTrigger,
    public status: ProcessExecutionTraceStatus,
    public readonly processName: string,
    public readonly retention: ProcessExecutionTraceRetention,
    public readonly startedBy: string,
    public readonly updatedAt: number,
    public error: string | null,
    public completedAt: number | null,
    public expiresAt: number | null
  ) {}

  public changeStatus(status: ProcessExecutionTraceStatus.RUNNING | ProcessExecutionTraceStatus.PAUSED) {
    this.requireNotCompleted();
    this.status = status;
  }

  public complete(
    status: ProcessExecutionTraceStatus.COMPLETED | ProcessExecutionTraceStatus.FAILED,
    error: string | null,
    retention: ProcessExecutionTraceRetention
  ) {
    this.requireNotCompleted();
    this.status = status;
    this.error = error;
    this.completedAt = Date.now();
    this.expiresAt = resolveExpiresAt(retention);
  }

  public toDto(): ProcessExecutionTraceDto {
    return {
      executionId: this.executionId,
      processName: this.processName,
      trigger: this.trigger,
      status: this.status,
      startedBy: this.startedBy,
      error: this.error,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt
    };
  }

  private requireNotCompleted() {
    if (this.completedAt !== null) {
      throw new Error('Trace is already completed');
    }
  }
}

const RETENTION_HOURS: Record<ProcessExecutionTraceRetention, number | null> = {
  [ProcessExecutionTraceRetention.DISABLED]: null,
  [ProcessExecutionTraceRetention.ONE_DAY]: 24,
  [ProcessExecutionTraceRetention.ONE_WEEK]: 24 * 7,
  [ProcessExecutionTraceRetention.TWO_HOURS]: 2,
  [ProcessExecutionTraceRetention.SIX_HOURS]: 6,
  [ProcessExecutionTraceRetention.TWELVE_HOURS]: 12
};

function resolveExpiresAt(retention: ProcessExecutionTraceRetention): number | null {
  const hours = RETENTION_HOURS[retention];
  return hours === null ? null : Date.now() + hours * 60 * 60 * 1000;
}

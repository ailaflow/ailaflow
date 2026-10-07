import { SimpleEvent } from '@aibindkit/core';
import { ProcessExecution } from './process-execution';
import { ProcessExecutionTraceEvent } from '../repositories/process-execution-trace/process-execution-trace-event';
import { ProcessExecutionOutcome, ProcessExecutionOutcomeType, ProcessExecutionTraceStatus, ProcessLog } from '@ailaflow/shared';
import { ProcessExecutionTrace } from '../repositories/process-execution-trace/process-execution-trace';

export class ProcessExecutionTraceObserver {
  public readonly onTraceChanged = new SimpleEvent<ProcessExecutionTrace>();
  public readonly onEventCreated = new SimpleEvent<ProcessExecutionTraceEvent>();
  private lastStepId: string | null = null;

  public constructor(
    private readonly trace: ProcessExecutionTrace,
    private readonly execution: ProcessExecution
  ) {}

  private onCurrentStepChanged = (stepId: string | null) => {
    if (stepId && this.lastStepId !== stepId) {
      this.lastStepId = stepId;

      const event = ProcessExecutionTraceEvent.createStepChange(this.execution.id, stepId);
      this.onEventCreated.emit(event);
    }
  };

  private onLog = (log: ProcessLog) => {
    const event = ProcessExecutionTraceEvent.createLog(this.execution.id, log);
    this.onEventCreated.emit(event);
  };

  private onOutcome = (outcome: ProcessExecutionOutcome) => {
    switch (outcome.type) {
      case ProcessExecutionOutcomeType.FINISHED:
        this.trace.complete(ProcessExecutionTraceStatus.COMPLETED, null, this.trace.retention);
        break;
      case ProcessExecutionOutcomeType.FAILED:
        this.trace.complete(ProcessExecutionTraceStatus.FAILED, outcome.error, this.trace.retention);
        break;
      case ProcessExecutionOutcomeType.PAUSED:
        this.trace.changeStatus(ProcessExecutionTraceStatus.PAUSED);
        break;
    }
    this.onTraceChanged.emit(this.trace);
  };

  public subscribe() {
    this.execution.onCurrentStepChanged.subscribe(this.onCurrentStepChanged);
    this.execution.onLog.subscribe(this.onLog);
    this.execution.onOutcome.subscribe(this.onOutcome);
  }

  public unsubscribe() {
    this.execution.onCurrentStepChanged.unsubscribe(this.onCurrentStepChanged);
    this.execution.onLog.unsubscribe(this.onLog);
    this.execution.onOutcome.unsubscribe(this.onOutcome);
  }

  public init(isResumed: boolean) {
    if (isResumed) {
      this.trace.changeStatus(ProcessExecutionTraceStatus.RUNNING);
    }
    this.onTraceChanged.emit(this.trace);
  }
}

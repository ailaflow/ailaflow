import { ProcessExecutionTraceEventDto, ProcessExecutionTraceEventType, ProcessLog } from '@ailaflow/shared';

export class ProcessExecutionTraceEvent {
  public static createLog(executionId: string, log: ProcessLog): ProcessExecutionTraceEvent {
    return new ProcessExecutionTraceEvent(
      executionId,
      ProcessExecutionTraceEventType.LOG,
      log satisfies ProcessExecutionTraceEventDto['log'],
      Date.now()
    );
  }

  public static createStepChange(executionId: string, stepId: string): ProcessExecutionTraceEvent {
    return new ProcessExecutionTraceEvent(
      executionId,
      ProcessExecutionTraceEventType.STEP_CHANGE,
      { stepId } satisfies ProcessExecutionTraceEventDto['stepChange'],
      Date.now()
    );
  }

  public static createPause(executionId: string, stepId: string): ProcessExecutionTraceEvent {
    return new ProcessExecutionTraceEvent(
      executionId,
      ProcessExecutionTraceEventType.PAUSE,
      { stepId } satisfies ProcessExecutionTraceEventDto['pause'],
      Date.now()
    );
  }

  public constructor(
    public readonly executionId: string,
    public readonly type: ProcessExecutionTraceEventType,
    public readonly data: object | null,
    public readonly createdAt: number
  ) {}

  public toDto(): ProcessExecutionTraceEventDto {
    const dto: ProcessExecutionTraceEventDto = {
      type: this.type,
      createdAt: this.createdAt
    };
    if (this.type === ProcessExecutionTraceEventType.LOG) {
      dto.log = this.data as ProcessLog;
    } else if (this.type === ProcessExecutionTraceEventType.STEP_CHANGE) {
      dto.stepChange = this.data as ProcessExecutionTraceEventDto['stepChange'];
    } else if (this.type === ProcessExecutionTraceEventType.PAUSE) {
      dto.pause = this.data as ProcessExecutionTraceEventDto['pause'];
    } else {
      throw new Error('Invalid trace event type');
    }
    return dto;
  }
}

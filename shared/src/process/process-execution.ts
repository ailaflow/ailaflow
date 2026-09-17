export type ProcessExecutionVariableValues = Record<string, unknown>;

export enum ProcessExecutionOutcomeType {
  FAILED = 1,
  FINISHED = 2,
  PAUSED = 3
}

export type ProcessExecutionOutcome =
  | {
      type: ProcessExecutionOutcomeType.FAILED;
      error: string;
      stepId?: string | null;
      interruptedCode?: number;
    }
  | {
      type: ProcessExecutionOutcomeType.FINISHED;
      output: ProcessExecutionVariableValues;
      interruptedStepId?: string;
    }
  | {
      type: ProcessExecutionOutcomeType.PAUSED;
      stepId: string | null;
    };

export enum ProcessLogLevel {
  INFO = 1,
  WARNING = 2,
  ERROR = 3
}

export type ProcessLog = [time: number, level: ProcessLogLevel, message: string];

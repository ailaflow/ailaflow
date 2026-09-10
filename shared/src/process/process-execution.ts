export type ProcessExecutionVariableValues = Record<string, unknown>;

export type ProcessExecutionResult =
  | {
      success: false;
      error: string;
      stepId?: string | null;
      interruptedCode?: number;
    }
  | {
      success: true;
      output: ProcessExecutionVariableValues;
      stepId?: string;
    };

export enum ProcessLogLevel {
  INFO = 1,
  WARNING = 2,
  ERROR = 3
}

export type ProcessLog = [time: number, level: ProcessLogLevel, message: string];

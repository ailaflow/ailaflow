export type ProcessExecutionVariableValues = Record<string, unknown>;

export enum ProcessExecutionMode {
  AI_TOOL_OR_START_FORM = 0,
  START_FORM = 1
}

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
  ERROR,
  WARNING,

  MATERIALIZER_STDOUT,
  MATERIALIZER_STDERR,

  SCRIPT_STDOUT,
  SCRIPT_STDERR,
  SCRIPT_FINISHED,

  AGENT_RESPONSE,
  AGENT_TOOL_CALL,
  AGENT_TOOL_RESPONSE
}

export type ProcessLog =
  | [time: number, level: ProcessLogLevel.INFO, message: string]
  | [time: number, level: ProcessLogLevel.MATERIALIZER_STDOUT, stdout: string]
  | [time: number, level: ProcessLogLevel.MATERIALIZER_STDERR, stderr: string]
  | [time: number, level: ProcessLogLevel.SCRIPT_STDOUT, stdout: string]
  | [time: number, level: ProcessLogLevel.SCRIPT_STDERR, stderr: string]
  | [time: number, level: ProcessLogLevel.SCRIPT_FINISHED, totalTime: number, code: number]
  | [time: number, level: ProcessLogLevel.AGENT_RESPONSE, message: string]
  | [time: number, level: ProcessLogLevel.AGENT_TOOL_CALL, toolCallId: string, functionName: string, arguments: string]
  | [time: number, level: ProcessLogLevel.AGENT_TOOL_RESPONSE, toolCallId: string, arguments: string];

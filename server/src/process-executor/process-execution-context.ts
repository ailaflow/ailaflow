export enum ProcessExecutionTrigger {
  ENDPOINT,
  TOOL,
  SCHEDULED_JOB
}

export interface ProcessExecutionContext {
  trigger: ProcessExecutionTrigger;
  isTest: boolean;
  startedBy: string;
  parentProcessNames?: string[];
  chatSessionId?: string;
}

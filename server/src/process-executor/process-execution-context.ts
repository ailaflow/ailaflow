export interface ProcessExecutionContext {
  startedBy: string;
  parentProcessNames?: string[];
  chatSessionId?: string;
  isTest: boolean;
}

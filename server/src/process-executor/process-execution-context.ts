export interface ProcessExecutionContext {
  startedBy: string;
  chatSessionId?: string;
  isTest: boolean;
}

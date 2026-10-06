import { ProcessExecutionTrigger } from '@ailaflow/shared';

export interface ProcessExecutionContext {
  trigger: ProcessExecutionTrigger;
  isTest: boolean;
  startedBy: string;
  parentProcessNames?: string[];
  chatSessionId?: string;
}

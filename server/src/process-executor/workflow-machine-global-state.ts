import { ProcessLogger } from './services/process-logger';
import { ProcessScriptExecutor } from './services/process-script-executor';
import { ProcessVariableManager } from './services/process-variable-manager';
import { TaskManager } from './services/task-manager';

export interface WorkflowMachineGlobalState {
  result?: {
    outputVariableNames: string[];
    stepId: string;
  };

  executionId: string;
  $logger: ProcessLogger;
  $variables: ProcessVariableManager;
  $scriptExecutor: ProcessScriptExecutor;
  $taskManager: TaskManager;
}

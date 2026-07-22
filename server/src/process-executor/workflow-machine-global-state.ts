import { ProcessLogger } from './services/process-logger';
import { ProcessScriptExecutor } from './services/process-script-executor';
import { ProcessVariableManager } from './services/process-variable-manager';

export interface WorkflowMachineGlobalState {
  result?: {
    outputVariableNames: string[];
    stepId: string;
  };

  // Services
  $logger: ProcessLogger;
  $variables: ProcessVariableManager;
  $scriptExecutor: ProcessScriptExecutor;
}

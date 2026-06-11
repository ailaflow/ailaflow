import { InterruptedError } from './errors/interrupted-error';
import { WorkflowLogger } from './services/workflow-logger';
import { WorkflowScriptExecutor } from './services/workflow-script-executor';
import { WorkflowVariableManager } from './services/workflow-variable-manager';

export interface WorkflowMachineGlobalState {
  interruptedError?: InterruptedError;

  // Services
  $logger: WorkflowLogger;
  $variables: WorkflowVariableManager;
  $scriptExecutor: WorkflowScriptExecutor;
}

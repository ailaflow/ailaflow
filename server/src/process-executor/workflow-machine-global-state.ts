import { InterruptedError } from './errors/interrupted-error';
import { WorkflowLogger } from './services/workflow-logger';
import { WorkflowScriptExecutor } from './services/workflow-script-executor';
import { WorkflowVariableManager } from './services/workflow-variable-manager';

export type WorkflowMachineVariablesState = Record<string, unknown>;

export interface WorkflowMachineGlobalState {
  variablesState: WorkflowMachineVariablesState;
  interruptedError?: InterruptedError;

  // Services
  $logger: WorkflowLogger;
  $variables: WorkflowVariableManager;
  $scriptExecutor: WorkflowScriptExecutor;
}

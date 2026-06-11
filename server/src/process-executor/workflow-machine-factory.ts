import { createWorkflowMachineBuilder } from 'sequential-workflow-machine';
import { Process } from '../repositories/process-repository/process-repository';
import { SandboxIntanceManager } from '../sandbox/sandbox-instance-manager';
import { WorkflowMachine, WorkflowMachineVariableValues } from './workflow-machine';
import { activitySet } from './activities/activity-set';
import { WorkflowLogger } from './services/workflow-logger';
import { WorkflowVariableManager } from './services/workflow-variable-manager';
import { WorkflowScriptExecutor } from './services/workflow-script-executor';

export class WorkflowMachineFactory {
  private readonly builder = createWorkflowMachineBuilder(activitySet);

  public constructor(private readonly sandboxInstanceManager: SandboxIntanceManager) {}

  public create(process: Process, input: WorkflowMachineVariableValues): WorkflowMachine {
    const variablesState = { ...input };

    const machine = this.builder.build(process.definition);
    const $logger = new WorkflowLogger();
    const $variables = new WorkflowVariableManager(variablesState);
    const $scriptExecutor = new WorkflowScriptExecutor(process, $logger, this.sandboxInstanceManager);

    const interpreter = machine.create({
      init: () => {
        return {
          variablesState,
          $logger,
          $variables,
          $scriptExecutor
        };
      }
    });
    return new WorkflowMachine(process.definition, interpreter, $logger);
  }
}

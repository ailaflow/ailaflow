import { createWorkflowMachineBuilder } from 'sequential-workflow-machine';
import { Process } from '../repositories/process-repository/process-repository';
import { SandboxInstanceManager } from '../sandbox/sandbox-instance-manager';
import { ProcessExecution, ProcessExecutionVariableValues } from './process-execution';
import { activitySet } from './activities/activity-set';
import { WorkflowLogger } from './services/workflow-logger';
import { WorkflowVariableManager } from './services/workflow-variable-manager';
import { WorkflowScriptExecutor } from './services/workflow-script-executor';
import { randomUUID } from 'crypto';
import { ProcessExecutionStore } from './process-execution-store';

export class ProcessExecutor {
  private readonly builder = createWorkflowMachineBuilder(activitySet);

  public constructor(
    private readonly sandboxInstanceManager: SandboxInstanceManager,
    private readonly processExecutionStore: ProcessExecutionStore
  ) {}

  public initialize(process: Process, input: ProcessExecutionVariableValues): ProcessExecution {
    const executionId = randomUUID();

    const machine = this.builder.build(process.definition);

    const $logger = new WorkflowLogger();
    const $variables = new WorkflowVariableManager(input, process.definition.properties.variables);
    const $scriptExecutor = new WorkflowScriptExecutor(executionId, process, $logger, this.sandboxInstanceManager);

    const interpreter = machine.create({
      init: () => {
        return {
          $logger,
          $variables,
          $scriptExecutor
        };
      }
    });

    const execution = new ProcessExecution(interpreter, $logger, $variables);
    this.processExecutionStore.set(executionId, execution);
    execution.onDone.subscribe(() => this.processExecutionStore.delete(executionId));
    return execution;
  }
}

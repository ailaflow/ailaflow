import { createWorkflowMachineBuilder } from 'sequential-workflow-machine';
import { Process } from '../repositories/process-repository/process';
import { SandboxInstanceManager } from '../sandbox/sandbox-instance-manager';
import { ProcessExecution } from './process-execution';
import { activitySet } from './activities/activity-set';
import { ProcessLogger } from './services/process-logger';
import { ProcessVariableManager } from './services/process-variable-manager';
import { ProcessScriptExecutor } from './services/process-script-executor';
import { randomUUID } from 'crypto';
import { ProcessExecutionStore } from './process-execution-store';
import { ProcessExecutionVariableValues } from '@aila/model';

export class ProcessExecutor {
  private readonly builder = createWorkflowMachineBuilder(activitySet);

  public constructor(
    private readonly sandboxInstanceManager: SandboxInstanceManager,
    private readonly processExecutionStore: ProcessExecutionStore
  ) {}

  public initialize(process: Process, input: ProcessExecutionVariableValues): ProcessExecution {
    const executionId = randomUUID();

    const machine = this.builder.build(process.definition);

    const $logger = new ProcessLogger();
    const $variables = new ProcessVariableManager(input, process.getVariableValidatorMap());
    const $scriptExecutor = new ProcessScriptExecutor(executionId, process, $logger, this.sandboxInstanceManager);

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
    execution.onFinished.subscribe(() => this.processExecutionStore.delete(executionId));
    return execution;
  }
}

import { ProcessExecutionVariableValues } from '@aila/model';
import { Process } from '../repositories/process/process';
import { SandboxInstanceManager } from '../sandbox/sandbox-instance-manager';
import { ProcessLogger } from './services/process-logger';
import { ProcessScriptExecutor } from './services/process-script-executor';
import { ProcessVariableManager } from './services/process-variable-manager';
import { TaskManager } from './services/task-manager';

export interface SerializedProcessExecutionGlobalState {
  executionId: string;
  variableValues: ProcessExecutionVariableValues;
}

export interface ProcessExecutionGlobalStateServices {
  sandboxInstanceManager: SandboxInstanceManager;
  taskManager: TaskManager;
}

export class ProcessExecutionGlobalState {
  public static create(
    executionId: string,
    variableValues: ProcessExecutionVariableValues,
    process: Process,
    services: ProcessExecutionGlobalStateServices
  ): ProcessExecutionGlobalState {
    const $logger = new ProcessLogger();
    const $variables = new ProcessVariableManager(variableValues, process.variables);
    const $scriptExecutor = new ProcessScriptExecutor(executionId, process, $logger, services.sandboxInstanceManager);

    return new ProcessExecutionGlobalState(executionId, $logger, $variables, $scriptExecutor, services.taskManager);
  }

  public static deserialize(
    serialized: SerializedProcessExecutionGlobalState,
    process: Process,
    services: ProcessExecutionGlobalStateServices
  ): ProcessExecutionGlobalState {
    return this.create(serialized.executionId, serialized.variableValues, process, services);
  }

  public result?: {
    outputVariableNames: string[];
    stepId: string;
  };

  public constructor(
    public readonly executionId: string,
    public readonly $logger: ProcessLogger,
    public readonly $variables: ProcessVariableManager,
    public readonly $scriptExecutor: ProcessScriptExecutor,
    public readonly $taskManager: TaskManager
  ) {}

  public serialize(): SerializedProcessExecutionGlobalState {
    return {
      executionId: this.executionId,
      variableValues: this.$variables.dump()
    };
  }
}

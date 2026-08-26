import { ProcessExecutionVariableValues } from '@aila/model';
import { Process } from '../repositories/process/process';
import { ProcessLogger } from './services/process-logger';
import { ProcessScriptExecutor } from './services/process-script-executor';
import { ProcessVariableManager } from './services/process-variable-manager';
import { TaskCreator } from '../task/task-creator';
import { Notifier } from './services/notifier';
import { ProcessExecutionServices } from './services/services';
import { ProcessVariableEvaluator } from './services/process-value-evaluator';
import { ProcessExecutionContext } from './process-execution-context';

export interface SerializedProcessExecutionGlobalState {
  variableValues: ProcessExecutionVariableValues;
}

export class ProcessExecutionGlobalState {
  public static create(
    executionId: string,
    context: ProcessExecutionContext,
    variableValues: ProcessExecutionVariableValues,
    process: Process,
    services: ProcessExecutionServices
  ): ProcessExecutionGlobalState {
    const logger = new ProcessLogger();
    const variables = new ProcessVariableManager(variableValues, process.variables);
    const variableEvaluator = new ProcessVariableEvaluator(variables);
    const scriptExecutor = new ProcessScriptExecutor(executionId, process, logger, services.sandboxInstanceManager);

    return new ProcessExecutionGlobalState(
      executionId,
      context,
      logger,
      variables,
      variableEvaluator,
      scriptExecutor,
      services.taskCreator,
      services.notifier
    );
  }

  public static deserialize(
    executionId: string,
    context: ProcessExecutionContext,
    serialized: SerializedProcessExecutionGlobalState,
    process: Process,
    services: ProcessExecutionServices
  ): ProcessExecutionGlobalState {
    return this.create(executionId, context, serialized.variableValues, process, services);
  }

  public result?: {
    outputVariableNames: string[];
    stepId: string;
  };

  public constructor(
    public readonly executionId: string,
    public readonly context: ProcessExecutionContext,
    public readonly logger: ProcessLogger,
    public readonly variables: ProcessVariableManager,
    public readonly variableEvaluator: ProcessVariableEvaluator,
    public readonly scriptExecutor: ProcessScriptExecutor,
    public readonly taskCreator: TaskCreator,
    public readonly notifier: Notifier
  ) {}

  public serialize(): SerializedProcessExecutionGlobalState {
    return {
      variableValues: this.variables.dump()
    };
  }
}

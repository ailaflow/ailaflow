import { ProcessExecutionVariableValues } from '@aila/model';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { UserAssignedTaskProvider } from './user-assigned-task-provider';

export class TaskInputVariableValuesProvider {
  public constructor(
    private readonly userAssignedTaskProvider: UserAssignedTaskProvider,
    private readonly persistedExecutionRepository: PersistedExecutionRepository
  ) {}

  public async tryGet(
    abortSignal: AbortSignal,
    isTest: boolean,
    userName: string,
    taskId: string
  ): Promise<TaskInputVariableValues | null> {
    const userAssignedTask = await this.userAssignedTaskProvider.tryGet(abortSignal, isTest, userName, taskId);
    if (!userAssignedTask) {
      return null;
    }

    const execution = await this.persistedExecutionRepository.tryGet(abortSignal, userAssignedTask.task.executionId);
    if (!execution) {
      throw new Error('Cannot find the execution');
    }

    return new TaskInputVariableValues(userAssignedTask.task.inputVariableNames, execution.state.context.globalState.variableValues);
  }
}

export class TaskInputVariableValues {
  public constructor(
    private readonly inputVariableNames: string[],
    private readonly executionValues: ProcessExecutionVariableValues
  ) {}

  public tryGetOne(name: string): unknown | undefined {
    if (!this.inputVariableNames.includes(name)) {
      return undefined;
    }
    return this.getRequired(name);
  }

  public getAll(): ProcessExecutionVariableValues {
    return Object.fromEntries(this.inputVariableNames.map(name => [name, this.getRequired(name)]));
  }

  private getRequired(name: string): unknown {
    const value = this.executionValues[name];
    if (value === undefined) {
      throw new Error(`The variable \$${name} does not exist in the execution context`);
    }
    return value;
  }
}

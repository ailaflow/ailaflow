import { JsonSchema, ProcessExecutionVariableValues } from '@ailaflow/shared';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { UserAssignedTaskProvider } from './user-assigned-task-provider';

export class UserTaskDetailsProvider {
  public constructor(
    private readonly provider: UserAssignedTaskProvider,
    private readonly repository: PersistedExecutionRepository
  ) {}

  public async tryGet(abortSignal: AbortSignal, isTest: boolean, userName: string, taskId: string): Promise<TaskDetails | null> {
    const userAssignedTask = await this.provider.tryGet(abortSignal, isTest, userName, taskId);
    if (!userAssignedTask) {
      return null;
    }

    const execution = await this.repository.tryGet(abortSignal, userAssignedTask.task.executionId);
    if (!execution) {
      throw new Error('Cannot find the execution');
    }

    return new TaskDetails(
      userAssignedTask.task.inputVariableNames,
      execution.state.context.globalState.variableValues,
      userAssignedTask.task.outputVariableSchemas
    );
  }
}

export class TaskDetails {
  public constructor(
    private readonly inputVariableNames: string[],
    private readonly executionVariableValues: ProcessExecutionVariableValues,
    public readonly outputVariableSchemas: Record<string, JsonSchema> | null
  ) {}

  public tryGetInputVariableValue(name: string): unknown | undefined {
    if (!this.inputVariableNames.includes(name)) {
      return undefined;
    }
    return this.getRequiredInputVariableValue(name);
  }

  public getAllInputVariableValues(): ProcessExecutionVariableValues {
    const values: ProcessExecutionVariableValues = {};
    for (const name of this.inputVariableNames) {
      values[name] = this.getRequiredInputVariableValue(name);
    }
    return values;
  }

  private getRequiredInputVariableValue(name: string): unknown {
    const value = this.executionVariableValues[name];
    if (value === undefined) {
      throw new Error(`The variable \$${name} does not exist in the execution context`);
    }
    return value;
  }
}

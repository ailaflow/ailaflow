import { ProcessExecutionVariableValues } from '@aila/model';
import { Task } from './task';

export class AssignedTask {
  public static create(taskId: string, userName: string, channelName: string): AssignedTask {
    return new AssignedTask(taskId, userName, channelName, null, null);
  }

  public constructor(
    public readonly taskId: string,
    public readonly userName: string,
    public readonly channelName: string,
    public completedAt: number | null,
    public outputValues: ProcessExecutionVariableValues | null
  ) {}

  public tryComplete(outputValues: ProcessExecutionVariableValues, task: Task): string | null {
    const error = task.variables.validateStartValues(outputValues);
    if (error) {
      return error;
    }

    this.completedAt = Date.now();
    this.outputValues = outputValues;
    return null;
  }
}

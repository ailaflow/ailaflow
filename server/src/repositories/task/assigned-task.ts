import { ProcessExecutionVariableValues } from '@aila/model';

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

  public complete(outputValues: ProcessExecutionVariableValues) {
    this.completedAt = Date.now();
    this.outputValues = outputValues;
  }
}

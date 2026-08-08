import { ProcessExecutionVariableValues } from '@aila/model';

export class AssignedTask {
  public static create(taskId: string, userName: string): AssignedTask {
    return new AssignedTask(taskId, userName, null, null);
  }

  public constructor(
    public readonly taskId: string,
    public readonly userName: string,
    public completedAt: number | null,
    public outputValues: ProcessExecutionVariableValues | null
  ) {}

  public complete(outputValues: ProcessExecutionVariableValues) {
    this.completedAt = Date.now();
    this.outputValues = outputValues;
  }
}

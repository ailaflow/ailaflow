export class AssignedTask {
  public static create(taskId: string, userName: string): AssignedTask {
    return new AssignedTask(taskId, userName, null);
  }

  public constructor(
    public readonly taskId: string,
    public readonly userName: string,
    public completedAt: number | null
  ) {}

  public complete() {
    this.completedAt = Date.now();
  }
}

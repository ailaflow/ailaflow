export class PersistentExecution {
  public static create(executionId: string, state: object): PersistentExecution {
    return new PersistentExecution(executionId, state, Date.now());
  }

  public constructor(
    public readonly executionId: string,
    public readonly state: object,
    public readonly createdAt: number
  ) {}
}

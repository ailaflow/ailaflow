export class TableData {
  public static create(tableName: string, pk: string, data: unknown): TableData {
    return new TableData(tableName, pk, data, Date.now());
  }

  public constructor(
    public readonly tableName: string,
    public readonly pk: string,
    public readonly data: unknown,
    public readonly updatedAt: number
  ) {}
}

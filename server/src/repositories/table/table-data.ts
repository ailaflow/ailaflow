import { TableDataRepositoryError } from './table-data-repository';

export class TableData {
  public static create(tableName: string, pk: string, data: unknown): TableData {
    if (data === undefined || data === null) {
      throw new TableDataRepositoryError('Cannot create table data with undefined or null value');
    }

    return new TableData(tableName, pk, data, Date.now());
  }

  public constructor(
    public readonly tableName: string,
    public readonly pk: string,
    public readonly data: unknown,
    public readonly updatedAt: number
  ) {}
}

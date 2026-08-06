import { TableData } from './table-data';

export class TableDataRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = TableDataRepositoryError.name;
  }
}

export interface TableDataRepository {
  tryGet(abortSignal: AbortSignal, tableName: string, pk: string): Promise<TableData | null>;
  upsert(abortSignal: AbortSignal, data: TableData): Promise<void>;
  delete(abortSignal: AbortSignal, tableName: string, pk: string): Promise<void>;
}

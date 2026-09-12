import { TableRow } from '@ailaflow/shared';

export class TableDataRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = TableDataRepositoryError.name;
  }
}

export interface TableDataRepository {
  tryGet(abortSignal: AbortSignal, tableName: string, _id: string): Promise<TableRow | null>;
  upsert(abortSignal: AbortSignal, tableName: string, row: Record<string, unknown> & { _id: string }): Promise<void>;
  delete(abortSignal: AbortSignal, tableName: string, _id: string): Promise<void>;
}

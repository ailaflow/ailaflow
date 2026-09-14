import { TableRow } from '@ailaflow/shared';
import { Transaction } from '../../core/transaction';
import { TableSchema } from './table-schema';

export class TableDataRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = TableDataRepositoryError.name;
  }
}

export interface TableDataRepository {
  tryGet(abortSignal: AbortSignal, schema: TableSchema, _id: string): Promise<TableRow | null>;
  upsert(
    abortSignal: AbortSignal,
    schema: TableSchema,
    row: Record<string, unknown> & { _id: string },
    transaction?: Transaction
  ): Promise<void>;
  delete(abortSignal: AbortSignal, tableName: string, _id: string, transaction?: Transaction): Promise<void>;
}

import { TableSchema } from './table-schema';
import { Transaction } from '../../core/transaction';

export class TableSchemaConcurrencyError extends Error {
  public constructor() {
    super('Table schema was changed concurrently');
    this.name = TableSchemaConcurrencyError.name;
  }
}

export interface TableSchemaRepository {
  get(abortSignal: AbortSignal, tableName: string): Promise<TableSchema>;
  tryGet(abortSignal: AbortSignal, tableName: string): Promise<TableSchema | null>;
  save(abortSignal: AbortSignal, schema: TableSchema, transaction?: Transaction): Promise<TableSchema>;
}

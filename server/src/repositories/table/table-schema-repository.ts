import { TableSchema } from './table-schema';

export class TableSchemaConcurrencyError extends Error {
  public constructor() {
    super('Table schema was changed concurrently');
    this.name = TableSchemaConcurrencyError.name;
  }
}

export interface TableSchemaRepository {
  get(abortSignal: AbortSignal, tableName: string): Promise<TableSchema>;
  save(abortSignal: AbortSignal, schema: TableSchema): Promise<TableSchema>;
}

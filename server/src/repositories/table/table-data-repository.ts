import { TableData } from './table-data';

export interface TableDataRepository {
  upsert(abortSignal: AbortSignal, data: TableData): Promise<void>;
  delete(abortSignal: AbortSignal, tableName: string, pk: string): Promise<void>;
}

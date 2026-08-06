import { Repository } from '../repository';
import { Table } from './table';

export interface TableRepository extends Repository {
  insert(abortSignal: AbortSignal, table: Table): Promise<void>;
  update(abortSignal: AbortSignal, table: Table): Promise<void>;
  delete(abortSignal: AbortSignal, tableName: string): Promise<void>;
}

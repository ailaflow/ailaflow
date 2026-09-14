import { Transaction } from '../../core/transaction';
import { Repository } from '../repository';
import { Table } from './table';

export class TableRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = TableRepositoryError.name;
  }
}

export interface TableRepository extends Repository {
  insert(abortSignal: AbortSignal, table: Table, transaction?: Transaction): Promise<void>;
  update(abortSignal: AbortSignal, table: Table, transaction?: Transaction): Promise<void>;
  delete(abortSignal: AbortSignal, tableName: string, transaction?: Transaction): Promise<boolean>;
  tryGetByName(abortSignal: AbortSignal, tableName: string): Promise<Table | null>;
}

import { Transaction } from '../../core/transaction';
import { Repository } from '../repository';
import { Process } from './process';

export class ProcessRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = ProcessRepositoryError.name;
  }
}

export interface ProcessRepository extends Repository {
  insert(signal: AbortSignal, process: Process, transaction?: Transaction): Promise<void>;
  update(signal: AbortSignal, process: Process, transaction?: Transaction): Promise<void>;
  delete(signal: AbortSignal, name: string, transaction?: Transaction): Promise<boolean>;
  tryGetByName(signal: AbortSignal, name: string): Promise<Process | null>;
}

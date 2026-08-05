import { Repository } from '../repository';
import { Process } from './process';

export class ProcessRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = ProcessRepositoryError.name;
  }
}

export interface ProcessRepository extends Repository {
  insert(abortSignal: AbortSignal, process: Process): Promise<void>;
  update(abortSignal: AbortSignal, process: Process): Promise<void>;
  delete(abortSignal: AbortSignal, name: string): Promise<boolean>;
  tryGetByName(abortSignal: AbortSignal, name: string): Promise<Process | null>;
}

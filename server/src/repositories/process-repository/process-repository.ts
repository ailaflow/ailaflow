import { Repository } from '../repository';
import { Process } from './process';

export class ProcessRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = ProcessRepositoryError.name;
  }
}

export interface ProcessRepository extends Repository {
  insert(process: Process): Promise<void>;
  update(process: Process): Promise<void>;
  tryGetByName(name: string): Promise<Process | null>;
}

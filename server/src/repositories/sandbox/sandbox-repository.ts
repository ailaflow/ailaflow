import { Transaction } from '../../core/transaction';
import { Repository } from '../repository';
import { Sandbox } from './sandbox';

export class SandboxRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = SandboxRepositoryError.name;
  }
}

export interface SandboxRepository extends Repository {
  upsert(abortSignal: AbortSignal, sandbox: Sandbox, transaction?: Transaction): Promise<void>;
  tryGet(abortSignal: AbortSignal, name: string): Promise<Sandbox | null>;
}

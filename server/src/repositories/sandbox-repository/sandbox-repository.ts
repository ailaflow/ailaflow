import { Repository } from '../repository';
import { Sandbox } from './sandbox';

export class SandboxRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = SandboxRepositoryError.name;
  }
}

export interface SandboxRepository extends Repository {
  upsert(sandbox: Sandbox): Promise<void>;
  tryGet(name: string): Promise<Sandbox | null>;
}

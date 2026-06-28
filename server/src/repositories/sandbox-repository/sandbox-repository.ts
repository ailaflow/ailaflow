import { UpsertSandboxRequest } from '@aila/model';
import { Repository } from '../repository';

export class Sandbox {
  public static async create(data: UpsertSandboxRequest): Promise<Sandbox> {
    return new Sandbox(data.name, data.isEnabled, data.description, data.configuration, data.secrets, data.hash);
  }

  public constructor(
    public readonly name: string,
    public isEnabled: boolean,
    public description: string,
    public configuration: string,
    public secrets: Record<string, string>,
    public hash: string
  ) {}
}

export interface SandboxRepository extends Repository {
  upsert(sandbox: Sandbox): Promise<void>;
  tryGet(name: string): Promise<Sandbox | null>;
}

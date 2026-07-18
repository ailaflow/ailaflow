import { SandboxValidator, UpsertSandboxRequest } from '@aila/model';
import { SandboxRepositoryError } from './sandbox-repository';

export class Sandbox {
  public static async create(data: UpsertSandboxRequest): Promise<Sandbox> {
    const nameError = SandboxValidator.validateName(data.name);
    if (nameError) {
      throw new SandboxRepositoryError(nameError);
    }
    const descriptionError = SandboxValidator.validateDescription(data.description);
    if (descriptionError) {
      throw new SandboxRepositoryError(descriptionError);
    }

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

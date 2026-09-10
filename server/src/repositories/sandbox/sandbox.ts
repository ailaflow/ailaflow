import { SandboxValidator, UpsertSandboxRequest } from '@ailaflow/model';
import { SandboxRepositoryError } from './sandbox-repository';
import { fnv1a } from '@aibindkit/core';

export class Sandbox {
  public static create(data: UpsertSandboxRequest): Sandbox {
    const nameError = SandboxValidator.validateName(data.name);
    if (nameError) {
      throw new SandboxRepositoryError(nameError);
    }
    const descriptionError = SandboxValidator.validateDescription(data.description);
    if (descriptionError) {
      throw new SandboxRepositoryError(descriptionError);
    }

    const hash = fnv1a({
      secrets: data.secrets,
      configuration: data.configuration
    });
    return new Sandbox(data.name, data.isEnabled, data.description, data.configuration, data.secrets, hash);
  }

  public constructor(
    public readonly name: string,
    public readonly isEnabled: boolean,
    public readonly description: string,
    public readonly configuration: string,
    public readonly secrets: Record<string, string>,
    public readonly hash: string
  ) {}
}

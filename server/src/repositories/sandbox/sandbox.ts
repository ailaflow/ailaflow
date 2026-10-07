import { SandboxValidator, SaveSandboxRequest } from '@ailaflow/shared';
import { SandboxRepositoryError } from './sandbox-repository';
import { fnv1a } from '@aibindkit/core';
import { randomUUID } from 'node:crypto';

export class Sandbox {
  public static create(data: SaveSandboxRequest): Sandbox {
    const nameError = SandboxValidator.validateName(data.name);
    if (nameError) {
      throw new SandboxRepositoryError(nameError);
    }
    const descriptionError = SandboxValidator.validateDescription(data.description);
    if (descriptionError) {
      throw new SandboxRepositoryError(descriptionError);
    }

    const hash = calculateHash(data);
    const token = randomUUID();
    return new Sandbox(data.name, token, data.isEnabled, data.description, data.configuration, data.secrets, hash);
  }

  public constructor(
    public readonly name: string,
    public readonly token: string,
    public isEnabled: boolean,
    public description: string,
    public configuration: string,
    public secrets: Record<string, string>,
    public hash: string
  ) {}

  public update(data: SaveSandboxRequest) {
    if (this.name !== data.name) {
      throw new SandboxRepositoryError('Sandbox name cannot be changed');
    }

    const descriptionError = SandboxValidator.validateDescription(data.description);
    if (descriptionError) {
      throw new SandboxRepositoryError(descriptionError);
    }

    this.isEnabled = data.isEnabled;
    this.description = data.description;
    this.configuration = data.configuration;
    this.secrets = data.secrets;
    this.hash = calculateHash(data);
  }
}

function calculateHash(data: Pick<SaveSandboxRequest, 'secrets' | 'configuration'>) {
  return fnv1a({
    secrets: data.secrets,
    configuration: data.configuration
  });
}

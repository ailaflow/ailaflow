import { TableValidator } from '@ailaflow/shared';
import { TableRepositoryError } from './table-repository';

export class Table {
  public static create(name: string, description: string): Table {
    const nameError = TableValidator.validateName(name);
    if (nameError) {
      throw new TableRepositoryError(nameError);
    }
    validateDescription(description);
    return new Table(name, description);
  }

  public constructor(
    public readonly name: string,
    public description: string
  ) {}

  public update(description: string): void {
    validateDescription(description);
    this.description = description;
  }
}

function validateDescription(description: string): void {
  const descriptionError = TableValidator.validateDescription(description);
  if (descriptionError) {
    throw new TableRepositoryError(descriptionError);
  }
}

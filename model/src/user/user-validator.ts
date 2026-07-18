import { ResourceValidator } from '../resource';

export class UserValidator {
  public static readonly validateName = ResourceValidator.validateName;
  public static readonly validateAttributeName = ResourceValidator.validateName;

  public static validateAttributeNames(attributes: Record<string, unknown>): string | null {
    for (const attributeName of Object.keys(attributes)) {
      const error = UserValidator.validateAttributeName(attributeName);
      if (error) {
        return `Attribute name "${attributeName}" is invalid: ${error}`;
      }
    }
    return null;
  }
}

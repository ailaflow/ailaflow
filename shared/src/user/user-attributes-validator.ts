import { ResourceValidator } from '../resource';
import { UserAttributes } from './user-attributes';

export class UserAttributesValidator {
  public static readonly validateName = ResourceValidator.validateName;

  public static validateNames(attributes: UserAttributes): string | null {
    for (const attributeName of Object.keys(attributes)) {
      const error = UserAttributesValidator.validateName(attributeName);
      if (error) {
        return `Attribute name "${attributeName}" is invalid: ${error}`;
      }
    }
    return null;
  }
}

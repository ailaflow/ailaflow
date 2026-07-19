import { ALL_ATTRIBUTE_NAME, UserAttributes as Attributes, USER_NAME_ATTRIBUTE_NAME, UserAttributesValidator } from '@aila/model';
import { UserAttributesRepositoryError } from './user-attributes-repository';
import { User } from '../user-repository/user';

export class UserAttributes {
  public static create(user: User, attributes: Attributes): UserAttributes {
    for (const name of [USER_NAME_ATTRIBUTE_NAME, ALL_ATTRIBUTE_NAME]) {
      if (attributes[name]) {
        throw new Error(`Attribute name "${name}" is reserved`);
      }
    }

    const error = UserAttributesValidator.validateNames(attributes);
    if (error) {
      throw new UserAttributesRepositoryError(error);
    }

    const finalAttributes = {
      ...attributes,
      [USER_NAME_ATTRIBUTE_NAME]: user.name,
      [ALL_ATTRIBUTE_NAME]: true
    };
    return new UserAttributes(user.name, finalAttributes);
  }

  public constructor(
    public readonly userName: string,
    public readonly attributes: Attributes
  ) {}

  public getWithoutUserName(): Attributes {
    const attrs = { ...this.attributes };
    delete attrs[USER_NAME_ATTRIBUTE_NAME];
    delete attrs[ALL_ATTRIBUTE_NAME];
    return attrs;
  }
}

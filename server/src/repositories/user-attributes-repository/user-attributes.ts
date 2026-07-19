import { UserAttributes as Attributes, UserValidator } from '@aila/model';
import { UserAttributesRepositoryError } from './user-attributes-repository';
import { User } from '../user-repository/user';

const USER_ID_KEY = '$user_id';

export class UserAttributes {
  public static create(user: User, attributes: Attributes): UserAttributes {
    if (attributes[USER_ID_KEY]) {
      throw new Error(`Attribute name "${USER_ID_KEY}" is reserved`);
    }

    const error = UserValidator.validateAttributeNames(attributes);
    if (error) {
      throw new UserAttributesRepositoryError(error);
    }

    const finalAttributes = {
      ...attributes,
      [USER_ID_KEY]: user.id
    };
    return new UserAttributes(user.id, finalAttributes);
  }

  public constructor(
    public readonly userId: string,
    public readonly attributes: Attributes
  ) {}

  public getWithoutUserId(): Attributes {
    const attrs = { ...this.attributes };
    delete attrs[USER_ID_KEY];
    return attrs;
  }
}

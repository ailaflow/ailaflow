import { Repository } from '../repository';
import { UserAttributes } from './user-attributes';

export class UserAttributesRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = UserAttributesRepositoryError.name;
  }
}

export interface UserAttributesRepository extends Repository {
  get(userName: string): Promise<UserAttributes>;
  replace(attributes: UserAttributes): Promise<void>;
}

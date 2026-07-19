import { Repository } from '../repository';
import { UserAttributes } from './user-attributes';

export class UserAttributesRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = UserAttributesRepositoryError.name;
  }
}

export interface UserAttributesRepository extends Repository {
  get(abortSignal: AbortSignal, userName: string): Promise<UserAttributes>;
  replace(abortSignal: AbortSignal, attributes: UserAttributes): Promise<void>;
}

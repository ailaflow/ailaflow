import { Transaction } from '../../core/transaction';
import { Repository } from '../repository';
import { UserAttributes } from './user-attributes';

export class UserAttributesRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = UserAttributesRepositoryError.name;
  }
}

export interface UserAttributesRepository extends Repository {
  get(signal: AbortSignal, userName: string): Promise<UserAttributes>;
  replace(signal: AbortSignal, attributes: UserAttributes, transaction?: Transaction): Promise<void>;
}

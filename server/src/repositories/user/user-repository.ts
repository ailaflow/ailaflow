import { Transaction } from '../../core/transaction';
import { Repository } from '../repository';
import { User } from './user';

export class UserRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = UserRepositoryError.name;
  }
}

export interface UserRepository extends Repository {
  tryGetUser(abortSignal: AbortSignal, userName: string): Promise<User | null>;
  count(abortSignal: AbortSignal): Promise<number>;
  insert(abortSignal: AbortSignal, user: User, transaction?: Transaction): Promise<void>;
  update(abortSignal: AbortSignal, user: User, transaction?: Transaction): Promise<void>;
}

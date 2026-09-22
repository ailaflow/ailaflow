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
  tryGetUser(signal: AbortSignal, userName: string): Promise<User | null>;
  count(signal: AbortSignal, onlyActive: boolean): Promise<number>;
  insert(signal: AbortSignal, user: User, transaction?: Transaction): Promise<void>;
  update(signal: AbortSignal, user: User, transaction?: Transaction): Promise<void>;
}

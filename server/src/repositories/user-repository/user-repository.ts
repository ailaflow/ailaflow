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
  insert(abortSignal: AbortSignal, user: User): Promise<void>;
  update(abortSignal: AbortSignal, user: User): Promise<void>;
  count(abortSignal: AbortSignal): Promise<number>;
}

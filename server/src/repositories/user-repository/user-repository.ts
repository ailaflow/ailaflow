import { Repository } from '../repository';
import { User } from './user';

export class UserRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = UserRepositoryError.name;
  }
}

export interface UserRepository extends Repository {
  tryGetUser(userName: string): Promise<User | null>;
  tryGetById(id: string): Promise<User | null>;
  insert(user: User): Promise<void>;
  update(user: User): Promise<void>;
  count(): Promise<number>;
}

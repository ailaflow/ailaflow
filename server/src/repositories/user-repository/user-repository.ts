import { Repository } from '../repository';
import { PasswordHasher } from './password-hasher';

export class User {
  public static async create(name: string, password: string, isAdmin: boolean, hasher: PasswordHasher): Promise<User> {
    return new User(name, await hasher.hash(password), isAdmin);
  }

  public constructor(
    public readonly name: string,
    public readonly passwordHash: string,
    public readonly isAdmin: boolean
  ) {}

  public async comparePassword(password: string, hasher: PasswordHasher): Promise<boolean> {
    return this.passwordHash === (await hasher.hash(password));
  }
}

export interface UserRepository extends Repository {
  tryGetUser(userName: string): Promise<User | null>;
  insert(user: User): Promise<void>;
  count(): Promise<number>;
}

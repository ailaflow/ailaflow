import { PasswordHasher } from './password-hasher';
import { UserValidator } from '@ailaflow/shared';
import { UserRepositoryError } from './user-repository';

export class User {
  public static async create(name: string, password: string, isAdmin: boolean, hasher: PasswordHasher): Promise<User> {
    const nameError = UserValidator.validateName(name);
    if (nameError) {
      throw new UserRepositoryError(nameError);
    }
    return new User(name, await hasher.hash(password), isAdmin);
  }

  public constructor(
    public readonly name: string,
    public passwordHash: string,
    public isAdmin: boolean
  ) {}

  public async comparePassword(password: string, hasher: PasswordHasher): Promise<boolean> {
    return this.passwordHash === (await hasher.hash(password));
  }

  public async setPassword(password: string, hasher: PasswordHasher) {
    this.passwordHash = await hasher.hash(password);
  }

  public setIsAdmin(isAdmin: boolean) {
    this.isAdmin = isAdmin;
  }
}

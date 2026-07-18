import { randomUUID } from 'crypto';
import { PasswordHasher } from './password-hasher';
import { UserAttributes, UserValidator } from '@aila/model';
import { UserRepositoryError } from './user-repository';

export class User {
  public static async create(name: string, password: string, isAdmin: boolean, hasher: PasswordHasher): Promise<User> {
    const nameError = UserValidator.validateName(name);
    if (nameError) {
      throw new UserRepositoryError(nameError);
    }
    return new User(randomUUID(), name, await hasher.hash(password), isAdmin, {});
  }

  public constructor(
    public readonly id: string,
    public name: string,
    public passwordHash: string,
    public isAdmin: boolean,
    public attributes: UserAttributes
  ) {}

  public async comparePassword(password: string, hasher: PasswordHasher): Promise<boolean> {
    return this.passwordHash === (await hasher.hash(password));
  }

  public async setPassword(password: string, hasher: PasswordHasher) {
    this.passwordHash = await hasher.hash(password);
  }

  public setName(name: string) {
    const error = UserValidator.validateName(name);
    if (error) {
      throw new UserRepositoryError(error);
    }
    this.name = name;
  }

  public setIsAdmin(isAdmin: boolean) {
    this.isAdmin = isAdmin;
  }

  public setAttributes(attributes: UserAttributes) {
    const error = UserValidator.validateAttributeNames(attributes);
    if (error) {
      throw new UserRepositoryError(error);
    }
    this.attributes = attributes;
  }
}

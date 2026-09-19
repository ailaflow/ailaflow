import { UserValidator } from '@ailaflow/shared';
import { Cipher } from '../../core/cipher/cipher';
import { UserRepositoryError } from './user-repository';

export class User {
  public static async create(name: string, password: string, isAdmin: boolean, cipher: Cipher): Promise<User> {
    const nameError = UserValidator.validateName(name);
    if (nameError) {
      throw new UserRepositoryError(nameError);
    }
    return new User(name, await cipher.hashPassword(password), true, isAdmin);
  }

  public constructor(
    public readonly name: string,
    public passwordHash: string,
    public isActive: boolean,
    public isAdmin: boolean
  ) {}

  public comparePassword(password: string, cipher: Cipher): Promise<boolean> {
    return cipher.verifyPassword(password, this.passwordHash);
  }

  public async setPassword(password: string, cipher: Cipher): Promise<void> {
    this.passwordHash = await cipher.hashPassword(password);
  }

  public setIsActive(isActive: boolean) {
    this.isActive = isActive;
  }

  public setIsAdmin(isAdmin: boolean) {
    this.isAdmin = isAdmin;
  }
}

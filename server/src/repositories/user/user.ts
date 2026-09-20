import { UserValidator } from '@ailaflow/shared';
import { Cipher } from '../../core/cipher/cipher';
import { UserRepositoryError } from './user-repository';

export class User {
  public static async create(name: string, email: string | null, password: string, isAdmin: boolean, cipher: Cipher): Promise<User> {
    const nameError = UserValidator.validateName(name);
    if (nameError) {
      throw new UserRepositoryError(nameError);
    }
    const emailError = UserValidator.validateEmail(email);
    if (emailError) {
      throw new UserRepositoryError(emailError);
    }
    const passwordError = UserValidator.validatePassword(password);
    if (passwordError) {
      throw new UserRepositoryError(passwordError);
    }
    return new User(name, email, await cipher.hashPassword(password), true, isAdmin);
  }

  public constructor(
    public readonly name: string,
    public email: string | null,
    public passwordHash: string,
    public isActive: boolean,
    public isAdmin: boolean
  ) {}

  public comparePassword(password: string, cipher: Cipher): Promise<boolean> {
    return cipher.verifyPassword(password, this.passwordHash);
  }

  public setEmail(email: string | null) {
    const error = UserValidator.validateEmail(email);
    if (error) {
      throw new UserRepositoryError(error);
    }
    this.email = email;
  }

  public async setPassword(password: string, cipher: Cipher) {
    const error = UserValidator.validatePassword(password);
    if (error) {
      throw new UserRepositoryError(error);
    }
    this.passwordHash = await cipher.hashPassword(password);
  }

  public setIsActive(isActive: boolean) {
    this.isActive = isActive;
  }

  public setIsAdmin(isAdmin: boolean) {
    this.isAdmin = isAdmin;
  }
}

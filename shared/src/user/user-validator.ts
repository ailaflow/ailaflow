import { ResourceValidator } from '../resource';

export class UserValidator {
  public static readonly validateName = ResourceValidator.validateName;

  public static validatePassword(password: string): string | null {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  }

  public static validateEmail(email: string | null): string | null {
    if (email === null) {
      return null;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Invalid email';
  }
}

export class ProcessValidator {
  public static validateName(name: string): string | null {
    if (name.length < 3 || name.length > 20) {
      return 'Process name must be between 3 and 20 characters long.';
    }
    if (!/^[a-z][a-z0-9_]+$/.test(name)) {
      return 'Process name contains invalid characters.';
    }
    return null;
  }
}

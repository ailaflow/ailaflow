export class ResourceValidator {
  public static validateName(name: string): string | null {
    if (name.length < 3 || name.length > 32) {
      return 'Name must be between 3 and 32 characters long';
    }
    if (!/^[a-z][a-z0-9_]+$/.test(name)) {
      return 'Name must start with a lowercase letter and contain only lowercase letters, numbers, or underscores';
    }
    return null;
  }

  public static validateDescription(name: string): string | null {
    if (name.length > 256) {
      return 'Description must be less than 256 characters long';
    }
    return null;
  }
}

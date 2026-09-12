export class TableColumnNameValidator {
  public static validate(name: string): string | null {
    if (name === '_id' || name === '_updatedAt') {
      return null;
    }
    if (name.startsWith('_')) {
      return `Column name "${name}" is not allowed to start with an underscore`;
    }
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(name)) {
      return `Column name "${name}" contains invalid characters`;
    }
    return null;
  }
}

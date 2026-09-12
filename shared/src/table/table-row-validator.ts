import { TableColumnResolver } from './table-column-resolver';
import { TableSchemaError } from './table-schema-error';

export class TableRowValidator {
  public static validate(row: Record<string, unknown>): string | null {
    const idError = this.validateId(row._id);
    if (idError) {
      return idError;
    }

    try {
      for (const [name, value] of Object.entries(row)) {
        if (name === '_id' || name === '_updatedAt') {
          continue;
        }
        TableColumnResolver.resolve(name, value);
      }
      return null;
    } catch (error) {
      if (error instanceof TableSchemaError) {
        return error.message;
      }
      throw error;
    }
  }

  public static validateId(value: unknown): string | null {
    return typeof value === 'string' ? null : 'Table row must contain "_id" as a string';
  }
}

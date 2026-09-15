import { TableColumn } from './table-column';
import { TableColumnNameValidator } from './table-column-name-validator';
import { TableColumnType } from './table-column-type';
import { TableSchemaError } from './table-schema-error';

export class TableColumnResolver {
  public static resolve(name: string, value: unknown): TableColumn | null {
    const nameError = TableColumnNameValidator.validate(name);
    if (nameError) {
      throw new TableSchemaError(nameError);
    }
    if (value === undefined) {
      return null;
    }

    return { name, type: this.resolveValueType(name, value) };
  }

  public static resolveValueType(name: string, value: unknown): TableColumnType {
    if (typeof value === 'string') {
      return TableColumnType.STRING;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new TableSchemaError(`Column "${name}" is not allowed to contain a non-finite number`);
      }
      return TableColumnType.NUMBER;
    }
    if (typeof value === 'boolean') {
      return TableColumnType.BOOLEAN;
    }
    if (value !== null && typeof value === 'object') {
      return TableColumnType.JSON;
    }
    if (value === null) {
      throw new TableSchemaError(`Column "${name}" is not allowed to have a null value`);
    }
    throw new TableSchemaError(`Column "${name}" has unsupported value type "${typeof value}"`);
  }
}

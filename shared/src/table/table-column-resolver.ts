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
    if (typeof value === 'string') {
      return { name, type: TableColumnType.STRING };
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new TableSchemaError(`Column "${name}" is not allowed to contain a non-finite number`);
      }
      return { name, type: TableColumnType.NUMBER };
    }
    if (typeof value === 'boolean') {
      return { name, type: TableColumnType.BOOLEAN };
    }
    if (value !== null && typeof value === 'object') {
      return { name, type: TableColumnType.JSON };
    }
    if (value === null) {
      throw new TableSchemaError(`Column "${name}" is not allowed to have a null value`);
    }
    throw new TableSchemaError(`Column "${name}" has unsupported value type "${typeof value}"`);
  }
}

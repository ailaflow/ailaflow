import { TableColumn, TableColumnResolver, TableColumnType, TableRowValidator, TableSchemaError } from '@ailaflow/shared';

export class TableSchema {
  private readonly columnTypes: ReadonlyMap<string, TableColumnType>;

  public constructor(
    public readonly tableName: string,
    public readonly columns: readonly TableColumn[],
    public readonly newColumns: readonly TableColumn[] = []
  ) {
    this.columnTypes = new Map(columns.map(column => [column.name, column.type]));
  }

  public tryExtend(row: Record<string, unknown>): TableSchema | null {
    const idError = TableRowValidator.validateId(row._id);
    if (idError) {
      throw new TableSchemaError(idError);
    }

    const newColumns: TableColumn[] = [];

    for (const [name, value] of Object.entries(row)) {
      if (name === '_id' || name === '_updatedAt') {
        continue;
      }
      const column = TableColumnResolver.resolve(name, value);
      if (column === null) {
        continue;
      }

      const existingType = this.columnTypes.get(name);
      if (existingType !== undefined) {
        if (existingType !== column.type) {
          throw new TableSchemaError(
            `Column "${name}" expects type ${TableColumnType[existingType]} but received ${TableColumnType[column.type]}`
          );
        }
        continue;
      }

      newColumns.push(column);
    }

    if (newColumns.length === 0) {
      return null;
    }

    return new TableSchema(this.tableName, [...this.columns, ...newColumns], newColumns);
  }

  public getColumnType(name: string): TableColumnType | undefined {
    return this.columnTypes.get(name);
  }

  public asPersisted(): TableSchema {
    if (this.newColumns.length === 0) {
      return this;
    }
    return new TableSchema(this.tableName, this.columns);
  }
}

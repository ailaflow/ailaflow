import { TableColumnType } from './table-column-type';

export class TableColumnTypePolicy {
  public static isSortable(type: TableColumnType): boolean {
    return type !== TableColumnType.JSON;
  }
}

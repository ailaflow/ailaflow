import { TableColumnType } from './table-column-type';

export interface TableColumn {
  readonly name: string;
  readonly type: TableColumnType;
}

import { TableColumnType, TableRow } from '@ailaflow/shared';
import { SQLInputValue } from 'node:sqlite';
import { TableSchema } from './table-schema';

export class TableRowSqliteCodec {
  public static encode(schema: TableSchema, row: Record<string, unknown>): SQLInputValue[] {
    return schema.columns.map(column => {
      const value = row[column.name];
      if (value === undefined) {
        return null;
      }

      switch (column.type) {
        case TableColumnType.STRING:
        case TableColumnType.NUMBER:
          return value as string | number;
        case TableColumnType.BOOLEAN:
          return value ? 1 : 0;
        case TableColumnType.JSON:
          return Buffer.from(JSON.stringify(value), 'utf8');
      }
    });
  }

  public static decode(schema: TableSchema, values: Record<string, unknown>): TableRow {
    const row: TableRow = {
      _id: values._id as string,
      _updatedAt: values._updatedAt as number
    };
    for (const column of schema.columns) {
      const value = values[column.name];
      if (value === null || value === undefined) {
        continue;
      }

      switch (column.type) {
        case TableColumnType.STRING:
        case TableColumnType.NUMBER:
          row[column.name] = value;
          break;
        case TableColumnType.BOOLEAN:
          row[column.name] = value === 1;
          break;
        case TableColumnType.JSON:
          row[column.name] = JSON.parse(Buffer.from(value as Uint8Array).toString('utf8')) as unknown;
          break;
      }
    }
    return row;
  }
}

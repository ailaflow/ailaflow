import { GetTableDataPageResponse } from '@ailaflow/shared';
import { TableSchema } from '../../repositories/table/table-schema';

export type TableDataWhereValue = string | number | boolean;

export interface TableDataWhereCondition {
  $eq?: TableDataWhereValue;
  $neq?: TableDataWhereValue;
  $lt?: TableDataWhereValue;
  $gt?: TableDataWhereValue;
  $lte?: TableDataWhereValue;
  $gte?: TableDataWhereValue;
}

export type TableDataWhere = Readonly<Record<string, Readonly<TableDataWhereCondition>>>;

export interface TableDataPageQuery {
  page: number;
  pageSize: number;
  orderBy: string;
  ascending: boolean;
  where?: TableDataWhere;
}

export interface TableDataPageQuerier {
  query(signal: AbortSignal, schema: TableSchema, query: TableDataPageQuery): Promise<GetTableDataPageResponse>;
}

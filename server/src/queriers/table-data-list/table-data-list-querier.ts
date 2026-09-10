import { GetTableDataResponse } from '@ailaflow/shared';

export interface TableDataListQuerier {
  query(abortSignal: AbortSignal, tableName: string, page: number, pageSize: number): Promise<GetTableDataResponse>;
}

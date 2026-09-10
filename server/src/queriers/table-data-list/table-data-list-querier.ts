import { GetTableDataResponse } from '@ailaflow/model';

export interface TableDataListQuerier {
  query(abortSignal: AbortSignal, tableName: string, page: number, pageSize: number): Promise<GetTableDataResponse>;
}

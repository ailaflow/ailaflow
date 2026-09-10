import { GetTablesResponse } from '@ailaflow/model';

export interface TableListQuerier {
  query(abortSignal: AbortSignal, page: number, pageSize: number): Promise<GetTablesResponse>;
}

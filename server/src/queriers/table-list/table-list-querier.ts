import { GetTablesResponse } from '@ailaflow/shared';

export interface TableListQuerier {
  query(abortSignal: AbortSignal, page: number, pageSize: number): Promise<GetTablesResponse>;
}

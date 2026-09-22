import { GetTablesResponse } from '@ailaflow/shared';

export interface TableListQuerier {
  query(signal: AbortSignal, page: number, pageSize: number): Promise<GetTablesResponse>;
}

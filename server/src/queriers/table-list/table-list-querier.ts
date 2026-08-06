import { GetTablesResponse } from '@aila/model';

export interface TableListQuerier {
  query(abortSignal: AbortSignal, page: number, pageSize: number): Promise<GetTablesResponse>;
}

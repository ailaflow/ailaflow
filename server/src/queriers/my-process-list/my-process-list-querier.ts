import { GetMyProcessesResponse } from '@ailaflow/shared';

export interface MyProcessListQuerier {
  query(abortSignal: AbortSignal, userName: string, page: number, pageSize: number): Promise<GetMyProcessesResponse>;
}

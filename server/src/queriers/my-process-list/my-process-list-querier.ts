import { GetMyProcessesResponse } from '@ailaflow/model';

export interface MyProcessListQuerier {
  query(abortSignal: AbortSignal, userName: string, page: number, pageSize: number): Promise<GetMyProcessesResponse>;
}

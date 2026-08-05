import { GetMyProcessesResponse } from '@aila/model';

export interface MyProcessListQuerier {
  query(abortSignal: AbortSignal, userName: string, page: number, pageSize: number): Promise<GetMyProcessesResponse>;
}

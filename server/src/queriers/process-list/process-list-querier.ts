import { GetProcessesResponse } from '@ailaflow/model';

export interface ProcessListQuerier {
  query(abortSignal: AbortSignal, page: number, pageSize: number, search?: string): Promise<GetProcessesResponse>;
}

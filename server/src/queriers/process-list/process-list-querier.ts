import { GetProcessesResponse } from '@ailaflow/shared';

export interface ProcessListQuerier {
  query(abortSignal: AbortSignal, page: number, pageSize: number, search?: string): Promise<GetProcessesResponse>;
}

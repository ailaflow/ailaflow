import { GetProcessesResponse } from '@aila/model';

export interface ProcessListQuerier {
  query(abortSignal: AbortSignal, page: number, pageSize: number): Promise<GetProcessesResponse>;
}

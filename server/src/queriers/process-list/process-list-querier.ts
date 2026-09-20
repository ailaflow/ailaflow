import { GetProcessesResponse, ProcessDisplay } from '@ailaflow/shared';

export interface ProcessListQuerier {
  query(
    abortSignal: AbortSignal,
    page: number,
    pageSize: number,
    displayAtLeast: ProcessDisplay,
    search?: string
  ): Promise<GetProcessesResponse>;
}

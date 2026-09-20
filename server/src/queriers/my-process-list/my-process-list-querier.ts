import { GetMyProcessesResponse, ProcessDisplay } from '@ailaflow/shared';

export interface MyProcessListQuerier {
  query(
    abortSignal: AbortSignal,
    userName: string,
    page: number,
    pageSize: number,
    displayAtLeast: ProcessDisplay
  ): Promise<GetMyProcessesResponse>;
}

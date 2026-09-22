import { GetMyProcessesResponse, ProcessDisplay } from '@ailaflow/shared';

export interface MyProcessListQuerier {
  query(
    signal: AbortSignal,
    userName: string,
    page: number,
    pageSize: number,
    displayAtLeast: ProcessDisplay
  ): Promise<GetMyProcessesResponse>;
}

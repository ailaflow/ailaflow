import { GetMyTasksResponse } from '@ailaflow/shared';

export interface MyTaskListQuerier {
  query(
    signal: AbortSignal,
    isTest: boolean,
    userName: string,
    onlyOpen: boolean,
    page: number,
    pageSize: number
  ): Promise<GetMyTasksResponse>;
}

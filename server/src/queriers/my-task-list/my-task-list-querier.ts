import { GetMyTasksResponse } from '@ailaflow/model';

export interface MyTaskListQuerier {
  query(
    abortSignal: AbortSignal,
    isTest: boolean,
    userName: string,
    onlyOpen: boolean,
    page: number,
    pageSize: number
  ): Promise<GetMyTasksResponse>;
}

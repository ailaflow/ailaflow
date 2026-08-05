import { GetMyTasksResponse } from '@aila/model';

export interface MyTaskListQuerier {
  query(abortSignal: AbortSignal, userName: string, onlyOpen: boolean, page: number, pageSize: number): Promise<GetMyTasksResponse>;
}

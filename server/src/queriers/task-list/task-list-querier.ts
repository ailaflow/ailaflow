import { GetTasksResponse } from '@ailaflow/model';

export interface TaskListQuerier {
  query(abortSignal: AbortSignal, onlyOpen: boolean, page: number, pageSize: number): Promise<GetTasksResponse>;
}

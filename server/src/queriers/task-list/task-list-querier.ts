import { GetTasksResponse } from '@ailaflow/shared';

export interface TaskListQuerier {
  query(abortSignal: AbortSignal, onlyOpen: boolean, page: number, pageSize: number): Promise<GetTasksResponse>;
}

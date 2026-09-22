import { GetTasksResponse } from '@ailaflow/shared';

export interface TaskListQuerier {
  query(signal: AbortSignal, onlyOpen: boolean, page: number, pageSize: number): Promise<GetTasksResponse>;
}

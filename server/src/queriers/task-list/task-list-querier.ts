import { GetTasksResponse } from '@aila/model';

export interface TaskListQuerier {
  query(abortSignal: AbortSignal, onlyOpen: boolean, page: number, pageSize: number): Promise<GetTasksResponse>;
}

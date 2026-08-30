import { HttpClient } from '@aibindkit/react';
import type { DeleteTaskResponse, GetTasksRequest, GetTasksResponse } from '@aila/model';

export class TaskApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getTasks(abortSignal: AbortSignal, request: GetTasksRequest): Promise<GetTasksResponse> {
    const query = new URLSearchParams({
      onlyOpen: request.onlyOpen ? '1' : '0',
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    return this.client.json(abortSignal, 'GET', `/api/tasks?${query}`);
  }

  public deleteTask(abortSignal: AbortSignal, id: string): Promise<DeleteTaskResponse> {
    return this.client.json(abortSignal, 'DELETE', `/api/tasks/${encodeURIComponent(id)}`);
  }
}

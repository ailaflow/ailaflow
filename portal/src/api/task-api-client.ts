import { HttpClient } from '@aibindkit/react';
import type { DeleteTaskResponse, GetTasksRequest, GetTasksResponse } from '@ailaflow/shared';

export class TaskApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getTasks(signal: AbortSignal, request: GetTasksRequest): Promise<GetTasksResponse> {
    const query = new URLSearchParams({
      onlyOpen: request.onlyOpen ? '1' : '0',
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    return this.client.json(signal, 'GET', `/api/tasks?${query}`);
  }

  public deleteTask(signal: AbortSignal, id: string): Promise<DeleteTaskResponse> {
    return this.client.json(signal, 'DELETE', `/api/tasks/${encodeURIComponent(id)}`);
  }
}

import { HttpClient } from '@aibindkit/react';
import type {
  GetMyTaskFormRequest,
  GetMyTaskFormResponse,
  GetMyTasksRequest,
  GetMyTasksResponse,
  GetTaskVariableValueRequest,
  GetTaskVariableValueResponse,
  SubmitMyTaskRequest,
  SubmitMyTaskResponse
} from '@ailaflow/shared';

export class MyTaskApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getMyTasks(signal: AbortSignal, request: GetMyTasksRequest): Promise<GetMyTasksResponse> {
    const query = new URLSearchParams({
      onlyOpen: request.onlyOpen ? '1' : '0',
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    return this.client.json(signal, 'GET', `/api/my-tasks?${query}`);
  }

  public getMyTaskForm(signal: AbortSignal, id: string, request: GetMyTaskFormRequest): Promise<GetMyTaskFormResponse> {
    const query = new URLSearchParams();
    if (request.testUserName) {
      query.set('testUserName', request.testUserName);
    }
    return this.client.json(signal, 'GET', `/api/my-tasks/${id}/form?${query}`);
  }

  public getTaskVariableValue(signal: AbortSignal, request: GetTaskVariableValueRequest): Promise<GetTaskVariableValueResponse> {
    return this.client.json(signal, 'POST', '/api/my-tasks/variable-value', request);
  }

  public submitMyTask(signal: AbortSignal, request: SubmitMyTaskRequest): Promise<SubmitMyTaskResponse> {
    return this.client.json(signal, 'POST', '/api/my-tasks/submit', request);
  }
}

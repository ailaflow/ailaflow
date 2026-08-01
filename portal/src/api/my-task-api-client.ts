import { HttpClient } from '@aibindkit/react';
import type {
  GetMyTaskFormResponse,
  GetMyTasksResponse,
  GetTaskVariableValueRequest,
  GetTaskVariableValueResponse,
  SubmitMyTaskRequest,
  SubmitMyTaskResponse
} from '@aila/model';

export class MyTaskApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getMyTasks(abortSignal: AbortSignal): Promise<GetMyTasksResponse> {
    return this.client.json(abortSignal, 'GET', '/api/my-tasks');
  }

  public getMyTaskForm(abortSignal: AbortSignal, id: string): Promise<GetMyTaskFormResponse> {
    return this.client.json(abortSignal, 'GET', `/api/my-tasks/${encodeURIComponent(id)}/form`);
  }

  public getTaskVariableValue(abortSignal: AbortSignal, request: GetTaskVariableValueRequest): Promise<GetTaskVariableValueResponse> {
    return this.client.json(abortSignal, 'POST', '/api/my-tasks/variable-value', request);
  }

  public submitMyTask(abortSignal: AbortSignal, request: SubmitMyTaskRequest): Promise<SubmitMyTaskResponse> {
    return this.client.json(abortSignal, 'POST', '/api/my-tasks/submit', request);
  }
}

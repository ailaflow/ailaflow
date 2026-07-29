import { HttpClient } from '@aibindkit/react';
import type { GetMyTasksResponse } from '@aila/model';

export class MyTaskApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async getMyTasks(abortSignal: AbortSignal): Promise<GetMyTasksResponse> {
    return this.client.json(abortSignal, 'GET', '/api/my-tasks');
  }
}

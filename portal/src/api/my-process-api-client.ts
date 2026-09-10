import { HttpClient } from '@aibindkit/react';
import type {
  GetMyProcessesRequest,
  GetMyProcessesResponse,
  GetMyProcessStartFormRequest,
  GetMyProcessStartFormResponse,
  StartMyProcessRequest,
  StartMyProcessResponse
} from '@ailaflow/model';

export class MyProcessApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getMyProcesses(abortSignal: AbortSignal, request: GetMyProcessesRequest): Promise<GetMyProcessesResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    return this.client.json(abortSignal, 'GET', `/api/my-processes?${query}`);
  }

  public getMyProcessStartForm(
    abortSignal: AbortSignal,
    name: string,
    request: GetMyProcessStartFormRequest
  ): Promise<GetMyProcessStartFormResponse> {
    const query = new URLSearchParams();
    if (request.testUserName) {
      query.set('testUserName', request.testUserName);
    }
    return this.client.json(abortSignal, 'GET', `/api/my-processes/${name}/start-form?${query}`);
  }

  public startMyProcess(abortSignal: AbortSignal, name: string, request: StartMyProcessRequest): Promise<StartMyProcessResponse> {
    return this.client.json(abortSignal, 'POST', `/api/my-processes/${name}/start`, request);
  }
}

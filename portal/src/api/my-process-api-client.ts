import { HttpClient, HttpClientSseListener } from '@aibindkit/react';
import type {
  GetMyProcessesRequest,
  GetMyProcessesResponse,
  GetMyProcessStartFormRequest,
  GetMyProcessStartFormResponse,
  StartMyProcessRequest,
  StartMyProcessUpdate
} from '@ailaflow/shared';

export class MyProcessApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getMyProcesses(signal: AbortSignal, request: GetMyProcessesRequest): Promise<GetMyProcessesResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize),
      displayAtLeast: String(request.displayAtLeast)
    });
    return this.client.json(signal, 'GET', `/api/my-processes?${query}`);
  }

  public getMyProcessStartForm(
    signal: AbortSignal,
    name: string,
    request: GetMyProcessStartFormRequest
  ): Promise<GetMyProcessStartFormResponse> {
    const query = new URLSearchParams();
    if (request.testUserName) {
      query.set('testUserName', request.testUserName);
    }
    return this.client.json(signal, 'GET', `/api/my-processes/${name}/start-form?${query}`);
  }

  public startMyProcess(
    signal: AbortSignal,
    listener: HttpClientSseListener<StartMyProcessUpdate>,
    name: string,
    request: StartMyProcessRequest
  ) {
    return this.client.sse(signal, listener, 'POST', `/api/my-processes/${name}/start`, request);
  }
}

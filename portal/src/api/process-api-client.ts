import { HttpClient, HttpClientSseListener } from '@aibindkit/react';
import type {
  GetProcessResponse,
  GetProcessesResponse,
  SaveProcessRequest,
  SaveProcessResponse,
  TestProcessRequest,
  TestProcessUpdate
} from '@aila/model';

export class ProcessApiClient {
  public constructor(private readonly client: HttpClient) {}

  public saveProcess(abortSignal: AbortSignal, request: SaveProcessRequest): Promise<SaveProcessResponse> {
    return this.client.json(abortSignal, 'POST', '/api/process', request);
  }

  public getProcesses(abortSignal: AbortSignal): Promise<GetProcessesResponse> {
    return this.client.json(abortSignal, 'GET', '/api/processes');
  }

  public getProcess(abortSignal: AbortSignal, name: string): Promise<GetProcessResponse> {
    return this.client.json(abortSignal, 'GET', `/api/processes/${name}`);
  }

  public testProcess(
    abortSignal: AbortSignal,
    listener: HttpClientSseListener<TestProcessUpdate>,
    name: string,
    request: TestProcessRequest
  ) {
    return this.client.sse(abortSignal, listener, 'POST', `/api/processes/${name}/test`, request);
  }
}

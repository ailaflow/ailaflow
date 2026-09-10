import { HttpClient, HttpClientSseListener } from '@aibindkit/react';
import type {
  DeleteProcessResponse,
  DeleteProcessCronJobResponse,
  GetProcessCronJobsResponse,
  GetProcessResponse,
  GetProcessesRequest,
  GetProcessesResponse,
  SaveProcessRequest,
  SaveProcessResponse,
  SaveProcessCronJobRequest,
  SaveProcessCronJobResponse,
  TestProcessRequest,
  TestProcessUpdate
} from '@ailaflow/shared';

export class ProcessApiClient {
  public constructor(private readonly client: HttpClient) {}

  public saveProcess(abortSignal: AbortSignal, request: SaveProcessRequest): Promise<SaveProcessResponse> {
    return this.client.json(abortSignal, 'POST', '/api/process', request);
  }

  public getProcesses(abortSignal: AbortSignal, request: GetProcessesRequest): Promise<GetProcessesResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    if (request.search !== undefined) {
      query.set('search', request.search);
    }
    return this.client.json(abortSignal, 'GET', `/api/processes?${query}`);
  }

  public getProcess(abortSignal: AbortSignal, name: string): Promise<GetProcessResponse> {
    return this.client.json(abortSignal, 'GET', `/api/processes/${encodeURIComponent(name)}`);
  }

  public deleteProcess(abortSignal: AbortSignal, name: string): Promise<DeleteProcessResponse> {
    return this.client.json(abortSignal, 'DELETE', `/api/processes/${encodeURIComponent(name)}`);
  }

  public getProcessCronJobs(abortSignal: AbortSignal, processName: string): Promise<GetProcessCronJobsResponse> {
    return this.client.json(abortSignal, 'GET', `/api/processes/${encodeURIComponent(processName)}/cron-jobs`);
  }

  public saveProcessCronJob(abortSignal: AbortSignal, request: SaveProcessCronJobRequest): Promise<SaveProcessCronJobResponse> {
    return this.client.json(abortSignal, 'POST', '/api/process-cron-job', request);
  }

  public deleteProcessCronJob(abortSignal: AbortSignal, id: string): Promise<DeleteProcessCronJobResponse> {
    return this.client.json(abortSignal, 'DELETE', `/api/process-cron-jobs/${encodeURIComponent(id)}`);
  }

  public testProcess(
    abortSignal: AbortSignal,
    listener: HttpClientSseListener<TestProcessUpdate>,
    name: string,
    request: TestProcessRequest
  ) {
    return this.client.sse(abortSignal, listener, 'POST', `/api/processes/${encodeURIComponent(name)}/test`, request);
  }
}

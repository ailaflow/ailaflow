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
  TestProcessUpdate,
  ExportProcessResponse
} from '@ailaflow/shared';

export class ProcessApiClient {
  public constructor(private readonly client: HttpClient) {}

  public saveProcess(signal: AbortSignal, request: SaveProcessRequest): Promise<SaveProcessResponse> {
    return this.client.json(signal, 'POST', '/api/process', request);
  }

  public getProcesses(signal: AbortSignal, request: GetProcessesRequest): Promise<GetProcessesResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    if (request.search !== undefined) {
      query.set('search', request.search);
    }
    return this.client.json(signal, 'GET', `/api/processes?${query}`);
  }

  public getProcess(signal: AbortSignal, name: string): Promise<GetProcessResponse> {
    return this.client.json(signal, 'GET', `/api/processes/${name}`);
  }

  public deleteProcess(signal: AbortSignal, name: string): Promise<DeleteProcessResponse> {
    return this.client.json(signal, 'DELETE', `/api/processes/${name}`);
  }

  public exportProcess(signal: AbortSignal, name: string): Promise<ExportProcessResponse> {
    return this.client.json(signal, 'GET', `/api/processes/${name}/export`);
  }

  public getProcessCronJobs(signal: AbortSignal, processName: string): Promise<GetProcessCronJobsResponse> {
    return this.client.json(signal, 'GET', `/api/processes/${processName}/cron-jobs`);
  }

  public saveProcessCronJob(signal: AbortSignal, request: SaveProcessCronJobRequest): Promise<SaveProcessCronJobResponse> {
    return this.client.json(signal, 'POST', '/api/process-cron-job', request);
  }

  public deleteProcessCronJob(signal: AbortSignal, id: string): Promise<DeleteProcessCronJobResponse> {
    return this.client.json(signal, 'DELETE', `/api/process-cron-jobs/${id}`);
  }

  public testProcess(signal: AbortSignal, listener: HttpClientSseListener<TestProcessUpdate>, name: string, request: TestProcessRequest) {
    return this.client.sse(signal, listener, 'POST', `/api/processes/${name}/test`, request);
  }
}

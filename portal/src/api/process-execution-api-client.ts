import { HttpClient } from '@aibindkit/react';
import type {
  GetProcessExecutionTraceResponse,
  GetProcessExecutionTraceEventsResponse,
  GetProcessExecutionTracesRequest,
  GetProcessExecutionTracesResponse
} from '@ailaflow/shared';

export class ProcessExecutionApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getTraces(signal: AbortSignal, request: GetProcessExecutionTracesRequest): Promise<GetProcessExecutionTracesResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    if (request.processName !== undefined) {
      query.set('processName', request.processName);
    }
    return this.client.json(signal, 'GET', `/api/process-execution-traces?${query}`);
  }

  public getTraceEvents(signal: AbortSignal, executionId: string): Promise<GetProcessExecutionTraceEventsResponse> {
    return this.client.json(signal, 'GET', `/api/process-execution-traces/${executionId}/events`);
  }

  public getTrace(signal: AbortSignal, executionId: string): Promise<GetProcessExecutionTraceResponse> {
    return this.client.json(signal, 'GET', `/api/process-execution-traces/${executionId}`);
  }
}

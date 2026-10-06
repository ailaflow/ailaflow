import { GetProcessExecutionTraceEventsResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { ProcessExecutionTraceEventRepository } from '../../repositories/process-execution-trace/process-execution-trace-event-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetProcessExecutionTraceEventsEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/process-execution-traces/:executionId/events';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: ProcessExecutionTraceEventRepository) {}

  public async handle(req: Request): Promise<GetProcessExecutionTraceEventsResponse> {
    const signal = getEndpointAbortSignal(req);
    const executionId = String(req.params.executionId);
    const events = await this.repository.getAll(signal, executionId);
    return {
      events: events.map(event => event.toDto())
    };
  }
}

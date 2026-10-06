import { GetProcessExecutionTraceResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { ProcessExecutionTraceRepository } from '../../repositories/process-execution-trace/process-execution-trace-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class GetProcessExecutionTraceEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/process-execution-traces/:executionId';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: ProcessExecutionTraceRepository) {}

  public async handle(req: Request): Promise<GetProcessExecutionTraceResponse> {
    const signal = getEndpointAbortSignal(req);
    const executionId = String(req.params.executionId);
    const trace = await this.repository.tryGet(signal, executionId);
    if (!trace) {
      throw new EndpointError('Process execution trace not found', 404);
    }

    return {
      trace: trace.toDto()
    };
  }
}

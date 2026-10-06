import { GetProcessExecutionTracesResponse, getProcessExecutionTracesRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { ProcessExecutionTraceRepository } from '../../repositories/process-execution-trace/process-execution-trace-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseQuery } from '../framework/parse-request';

export class GetProcessExecutionTracesEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/process-execution-traces';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: ProcessExecutionTraceRepository) {}

  public async handle(req: Request): Promise<GetProcessExecutionTracesResponse> {
    const signal = getEndpointAbortSignal(req);
    const { page, pageSize, processName } = parseQuery(getProcessExecutionTracesRequestSchema, req.query);
    const offset = (page - 1) * pageSize;
    const [traces, totalCount] = await Promise.all([
      this.repository.getPage(signal, offset, pageSize, processName),
      this.repository.count(signal, processName)
    ]);

    return {
      traces: traces.map(trace => trace.toDto()),
      totalCount,
      page,
      pageSize
    };
  }
}

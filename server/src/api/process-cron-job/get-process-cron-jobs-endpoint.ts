import { GetProcessCronJobsResponse } from '@ailaflow/model';
import { Request } from 'express';
import { ProcessManager } from '../../process/process-manager';
import { ProcessCronJobRepository } from '../../repositories/process-cron-job/process-cron-job-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class GetProcessCronJobsEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/processes/:processName/cron-jobs';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly processManager: ProcessManager,
    private readonly repository: ProcessCronJobRepository
  ) {}

  public async handle(req: Request): Promise<GetProcessCronJobsResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const processName = String(req.params.processName);
    if (!(await this.processManager.tryGetByName(abortSignal, processName))) {
      throw new EndpointError('Process not found', 404);
    }
    return { jobs: await this.repository.getByProcessName(abortSignal, processName) };
  }
}

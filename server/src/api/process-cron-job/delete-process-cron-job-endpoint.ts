import { DeleteProcessCronJobResponse } from '@aila/model';
import { Request } from 'express';
import { ProcessCronJobRepository } from '../../repositories/process-cron-job/process-cron-job-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class DeleteProcessCronJobEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/process-cron-jobs/:id';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: ProcessCronJobRepository) {}

  public async handle(req: Request): Promise<DeleteProcessCronJobResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const id = String(req.params.id);
    if (!(await this.repository.delete(abortSignal, id))) {
      throw new EndpointError('Process cron job not found', 404);
    }
    return { id };
  }
}

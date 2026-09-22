import { SaveProcessCronJobResponse, saveProcessCronJobRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { ProcessManager } from '../../process/process-manager';
import { ProcessCronJob } from '../../repositories/process-cron-job/process-cron-job';
import { ProcessCronJobRepository, ProcessCronJobRepositoryError } from '../../repositories/process-cron-job/process-cron-job-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class SaveProcessCronJobEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/process-cron-job';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly processManager: ProcessManager,
    private readonly repository: ProcessCronJobRepository
  ) {}

  public async handle(req: Request): Promise<SaveProcessCronJobResponse> {
    const signal = getEndpointAbortSignal(req);
    const request = parseBody(saveProcessCronJobRequestSchema, req.body);
    const process = await this.processManager.tryGetByName(signal, request.processName);
    if (!process) {
      throw new EndpointError('Process not found', 404);
    }
    const inputError = process.variables.validateStartValues(request.inputValues);
    if (inputError) {
      throw new EndpointError(inputError, 400);
    }

    try {
      let job: ProcessCronJob;
      if (request.insert) {
        job = ProcessCronJob.create(request.processName, request.expression, request.timeZone, request.inputValues, request.isEnabled);
        await this.repository.insert(signal, job);
      } else {
        if (!request.id) {
          throw new EndpointError('Cron job ID is required', 400);
        }
        const existingJob = await this.repository.tryGet(signal, request.id);
        if (!existingJob) {
          throw new EndpointError('Process cron job not found', 404);
        }
        job = existingJob;
        if (job.processName !== request.processName) {
          throw new EndpointError('A process cron job cannot be moved to another process', 400);
        }
        job.update(request.expression, request.timeZone, request.inputValues, request.isEnabled);
        await this.repository.updateConfiguration(signal, job);
      }
      return { id: job.id };
    } catch (error) {
      if (error instanceof ProcessCronJobRepositoryError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
  }
}

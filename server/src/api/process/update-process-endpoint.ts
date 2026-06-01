import { Request } from 'express';
import { Endpoint } from '../endpoint';
import { updateProcessRequest, UpdateProcessResponse } from '@aila/model';
import { Process, ProcessRepository } from '../../repositories/process-repository/process-repository';
import { EndpointError } from '../endpoint-error';

export class UpdateProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/process';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly processRepository: ProcessRepository) {}

  public async handle(req: Request): Promise<UpdateProcessResponse> {
    const request = updateProcessRequest.parse(req.body);

    let process: Process;
    if (request.id) {
      const existingProcess = await this.processRepository.tryGetById(request.id);
      if (!existingProcess) {
        throw new EndpointError('Process not found', 404);
      }
      process = existingProcess;
      process.update(request);
      await this.processRepository.update(process);
    } else {
      process = Process.create(request);
      await this.processRepository.insert(process);
    }

    return {
      id: process.id
    };
  }
}

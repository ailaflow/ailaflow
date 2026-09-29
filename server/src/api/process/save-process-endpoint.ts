import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { saveProcessRequestSchema, SaveProcessResponse } from '@ailaflow/shared';
import { ProcessRepositoryError } from '../../repositories/process/process-repository';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';
import { Process } from '../../repositories/process/process';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { ProcessManager } from '../../process/process-manager';
import { ProcessValidatorsFactory } from '../../process/process-validators-factory';

export class SaveProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/process';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly processManager: ProcessManager,
    private readonly processValidatorsFactory: ProcessValidatorsFactory
  ) {}

  public async handle(req: Request): Promise<SaveProcessResponse> {
    const signal = getEndpointAbortSignal(req);
    const request = parseBody(saveProcessRequestSchema, req.body);

    const { rootValidator, stepValidator } = await this.processValidatorsFactory.create(signal, request.name);

    try {
      let process = await this.processManager.tryGetByName(signal, request.name);
      if (request.insert) {
        if (process) {
          throw new EndpointError('Process already exists', 400);
        }
        process = Process.create(request, rootValidator, stepValidator);
        await this.processManager.insert(signal, process);
      } else {
        if (!process) {
          throw new EndpointError('Process not found', 404);
        }
        await process.update(request, rootValidator, stepValidator);
        await this.processManager.update(signal, process);
      }
    } catch (e) {
      if (e instanceof ProcessRepositoryError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    return {
      name: request.name
    };
  }
}

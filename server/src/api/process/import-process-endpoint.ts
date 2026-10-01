import { Request } from 'express';
import { ProcessManager } from '../../process/process-manager';
import { Endpoint } from '../framework/endpoint';
import { importProcessRequestSchema } from '@ailaflow/shared';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';
import { ProcessValidatorsFactory } from '../../process/process-validators-factory';
import { Process } from '../../repositories/process/process';
import { getAuthToken } from '../auth/auth-middleware';
import { ProcessRepositoryError } from '../../repositories/process/process-repository';
import { EndpointError } from '../framework/endpoint-error';

export class ImportProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/import-process';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly processValidatorsFactory: ProcessValidatorsFactory,
    private readonly processManager: ProcessManager
  ) {}

  public async handle(req: Request) {
    const signal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);
    const request = parseBody(importProcessRequestSchema, req.body);

    const validators = await this.processValidatorsFactory.create(signal, request.process.name);
    const process = Process.import(request.process, authToken.userName, validators.rootValidator, validators.stepValidator);

    try {
      await this.processManager.insert(signal, process);
    } catch (e) {
      if (e instanceof ProcessRepositoryError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    return {};
  }
}

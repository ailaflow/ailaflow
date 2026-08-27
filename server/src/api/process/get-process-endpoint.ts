import { Request } from 'express';
import { ProcessManager } from '../../process/process-manager';
import { Endpoint } from '../framework/endpoint';
import { GetProcessResponse } from '@aila/model';
import { EndpointError } from '../framework/endpoint-error';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetProcessEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/processes/:name';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly processManager: ProcessManager) {}

  public async handle(req: Request): Promise<GetProcessResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const processName = String(req.params.name);

    const process = await this.processManager.tryGetByName(abortSignal, processName);
    if (!process) {
      throw new EndpointError('Process not found', 404);
    }

    return {
      process: {
        name: process.name,
        description: process.description,
        userAccessExpression: process.userAccessExpression,
        definition: process.definition
      }
    };
  }
}

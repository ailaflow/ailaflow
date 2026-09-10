import { DeleteProcessResponse } from '@ailaflow/model';
import { Request } from 'express';
import { ProcessManager } from '../../process/process-manager';
import { Endpoint } from '../framework/endpoint';
import { EndpointError } from '../framework/endpoint-error';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class DeleteProcessEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/processes/:name';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly processManager: ProcessManager) {}

  public async handle(req: Request): Promise<DeleteProcessResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const processName = String(req.params.name);
    const deleted = await this.processManager.delete(abortSignal, processName);
    if (!deleted) {
      throw new EndpointError('Process not found', 404);
    }

    return { name: processName };
  }
}

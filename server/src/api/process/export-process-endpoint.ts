import { Request } from 'express';
import { ProcessManager } from '../../process/process-manager';
import { Endpoint } from '../framework/endpoint';
import { ExportedProcess, ExportProcessResponse } from '@ailaflow/shared';
import { EndpointError } from '../framework/endpoint-error';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class ExportProcessEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/processes/:name/export';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly processManager: ProcessManager) {}

  public async handle(req: Request): Promise<ExportProcessResponse> {
    const signal = getEndpointAbortSignal(req);
    const processName = String(req.params.name);

    const process = await this.processManager.tryGetByName(signal, processName);
    if (!process) {
      throw new EndpointError('Process not found', 404);
    }

    const exportedProcess: ExportedProcess = {
      name: process.name,
      description: process.description,
      icon: process.icon,
      definition: process.definition,
      hash: process.hash
    };
    return {
      exportedProcess
    };
  }
}

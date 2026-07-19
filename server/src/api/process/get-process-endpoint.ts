import { Request } from 'express';
import { ProcessRepository } from '../../repositories/process-repository/process-repository';
import { Endpoint } from '../endpoint';
import { GetProcessResponse } from '@aila/model';
import { EndpointError } from '../endpoint-error';

export class GetProcessEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/processes/:name';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: ProcessRepository) {}

  public async handle(req: Request): Promise<GetProcessResponse> {
    const processName = String(req.params.name);

    const process = await this.repository.tryGetByName(processName);
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

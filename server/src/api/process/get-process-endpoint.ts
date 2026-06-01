import { Request } from 'express';
import { ProcessRepository } from '../../repositories/process-repository/process-repository';
import { Endpoint } from '../endpoint';
import { GetProcessResponse } from '@aila/model';
import { EndpointError } from '../endpoint-error';

export class GetProcessEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/processes/:id';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: ProcessRepository) {}

  public async handle(req: Request): Promise<GetProcessResponse> {
    const processId = String(req.params.id);

    const process = await this.repository.tryGetById(processId);
    if (!process) {
      throw new EndpointError('Process not found', 404);
    }

    return {
      process: {
        id: process.id,
        name: process.name,
        description: process.description,
        userList: process.userList,
        definition: process.definition
      }
    };
  }
}

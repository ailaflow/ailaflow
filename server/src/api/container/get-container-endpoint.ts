import { Request } from 'express';
import { GetContainerResponse } from '@aila/model';
import { ContainerRepository } from '../../repositories/container-repository/container-repository';
import { Endpoint } from '../endpoint';
import { EndpointError } from '../endpoint-error';

export class GetContainerEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/containers/:name';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: ContainerRepository) {}

  public async handle(req: Request): Promise<GetContainerResponse> {
    const containerName = String(req.params.name);

    const container = await this.repository.tryGet(containerName);
    if (!container) {
      throw new EndpointError('Container not found', 404);
    }

    return {
      container: {
        name: container.name,
        isEnabled: container.isEnabled,
        description: container.description,
        configuration: container.configuration
      }
    };
  }
}

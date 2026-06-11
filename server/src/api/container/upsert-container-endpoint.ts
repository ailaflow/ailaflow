import { Request } from 'express';
import { upsertContainerRequest } from '@aila/model';
import { Container, ContainerRepository } from '../../repositories/container-repository/container-repository';
import { Endpoint } from '../endpoint';

export class UpsertContainerEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/container';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly containerRepository: ContainerRepository) {}

  public async handle(req: Request) {
    const request = upsertContainerRequest.parse(req.body);
    const container = await Container.create(request);

    await this.containerRepository.upsert(container);

    return {};
  }
}

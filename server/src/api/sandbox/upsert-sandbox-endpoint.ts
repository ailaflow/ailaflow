import { Request } from 'express';
import { upsertSandboxRequest } from '@aila/model';
import { Sandbox, SandboxRepository } from '../../repositories/sandbox-repository/sandbox-repository';
import { Endpoint } from '../endpoint';

export class UpsertSandboxEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/sandbox';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly sandboxRepository: SandboxRepository) {}

  public async handle(req: Request) {
    const request = upsertSandboxRequest.parse(req.body);
    const sandbox = await Sandbox.create(request);

    await this.sandboxRepository.upsert(sandbox);

    return {};
  }
}

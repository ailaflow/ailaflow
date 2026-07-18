import { Request } from 'express';
import { upsertSandboxRequestSchema } from '@aila/model';
import { SandboxRepository } from '../../repositories/sandbox-repository/sandbox-repository';
import { Sandbox } from '../../repositories/sandbox-repository/sandbox';
import { Endpoint } from '../endpoint';
import { parseBody } from '../parse-body';

export class UpsertSandboxEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/sandbox';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly sandboxRepository: SandboxRepository) {}

  public async handle(req: Request) {
    const request = parseBody(upsertSandboxRequestSchema, req.body);
    const sandbox = await Sandbox.create(request);

    await this.sandboxRepository.upsert(sandbox);

    return {};
  }
}

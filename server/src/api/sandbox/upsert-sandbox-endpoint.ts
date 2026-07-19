import { Request } from 'express';
import { upsertSandboxRequestSchema } from '@aila/model';
import { SandboxRepository } from '../../repositories/sandbox-repository/sandbox-repository';
import { Sandbox } from '../../repositories/sandbox-repository/sandbox';
import { Endpoint } from '../framework/endpoint';
import { parseBody } from '../framework/parse-body';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class UpsertSandboxEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/sandbox';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly sandboxRepository: SandboxRepository) {}

  public async handle(req: Request) {
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(upsertSandboxRequestSchema, req.body);
    const sandbox = Sandbox.create(request);

    await this.sandboxRepository.upsert(abortSignal, sandbox);

    return {};
  }
}

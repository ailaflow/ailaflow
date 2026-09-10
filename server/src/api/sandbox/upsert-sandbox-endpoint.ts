import { Request } from 'express';
import { upsertSandboxRequestSchema } from '@ailaflow/model';
import { SandboxRepository } from '../../repositories/sandbox/sandbox-repository';
import { Sandbox } from '../../repositories/sandbox/sandbox';
import { Endpoint } from '../framework/endpoint';
import { parseBody } from '../framework/parse-request';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { SandboxInstanceManager } from '../../sandbox/sandbox-instance-manager';

export class UpsertSandboxEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/sandbox';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly sandboxRepository: SandboxRepository,
    private readonly sandboxInstanceManager: SandboxInstanceManager
  ) {}

  public async handle(req: Request) {
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(upsertSandboxRequestSchema, req.body);

    const sandbox = Sandbox.create(request);
    await this.sandboxRepository.upsert(abortSignal, sandbox);

    const oldSandbox = this.sandboxInstanceManager.tryGet(request.name);
    if (oldSandbox) {
      await oldSandbox.tryStop(abortSignal, new Error('Sandbox has been updated'));
    }

    return {};
  }
}

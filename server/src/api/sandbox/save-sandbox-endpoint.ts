import { Request } from 'express';
import { saveSandboxRequestSchema } from '@ailaflow/shared';
import { SandboxRepository, SandboxRepositoryError } from '../../repositories/sandbox/sandbox-repository';
import { Sandbox } from '../../repositories/sandbox/sandbox';
import { Endpoint } from '../framework/endpoint';
import { parseBody } from '../framework/parse-request';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { SandboxInstanceManager } from '../../sandbox/sandbox-instance-manager';
import { EndpointError } from '../framework/endpoint-error';

export class SaveSandboxEndpoint implements Endpoint {
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
    const request = parseBody(saveSandboxRequestSchema, req.body);

    try {
      let sandbox = await this.sandboxRepository.tryGet(abortSignal, request.name);
      if (request.insert) {
        if (sandbox) {
          throw new EndpointError('Sandbox already exists', 400);
        }
        sandbox = Sandbox.create(request);
        await this.sandboxRepository.insert(abortSignal, sandbox);
      } else {
        if (!sandbox) {
          throw new EndpointError('Sandbox not found', 404);
        }
        sandbox.update(request);
        await this.sandboxRepository.update(abortSignal, sandbox);
      }
    } catch (e) {
      if (e instanceof SandboxRepositoryError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    const oldSandbox = this.sandboxInstanceManager.tryGet(request.name);
    if (oldSandbox) {
      await oldSandbox.tryStop(abortSignal, new Error('Sandbox has been updated'));
    }

    return {};
  }
}

import { Request } from 'express';
import { GetSandboxResponse } from '@aila/model';
import { SandboxRepository } from '../../repositories/sandbox-repository/sandbox-repository';
import { Endpoint } from '../framework/endpoint';
import { EndpointError } from '../framework/endpoint-error';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetSandboxEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/sandboxes/:name';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: SandboxRepository) {}

  public async handle(req: Request): Promise<GetSandboxResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const sandboxName = String(req.params.name);

    const sandbox = await this.repository.tryGet(abortSignal, sandboxName);
    if (!sandbox) {
      throw new EndpointError('Sandbox not found', 404);
    }

    return {
      sandbox: {
        name: sandbox.name,
        isEnabled: sandbox.isEnabled,
        description: sandbox.description,
        configuration: sandbox.configuration,
        secrets: sandbox.secrets
      }
    };
  }
}

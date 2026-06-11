import { Request } from 'express';
import { GetSandboxResponse } from '@aila/model';
import { SandboxRepository } from '../../repositories/sandbox-repository/sandbox-repository';
import { Endpoint } from '../endpoint';
import { EndpointError } from '../endpoint-error';

export class GetSandboxEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/sandboxes/:name';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: SandboxRepository) {}

  public async handle(req: Request): Promise<GetSandboxResponse> {
    const sandboxName = String(req.params.name);

    const sandbox = await this.repository.tryGet(sandboxName);
    if (!sandbox) {
      throw new EndpointError('Sandbox not found', 404);
    }

    return {
      sandbox: {
        name: sandbox.name,
        isEnabled: sandbox.isEnabled,
        description: sandbox.description,
        configuration: sandbox.configuration,
        envVariables: sandbox.envVariables
      }
    };
  }
}

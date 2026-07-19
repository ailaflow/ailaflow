import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { UserRepository } from '../../repositories/user-repository/user-repository';
import { User } from '../../repositories/user-repository/user';
import { installRequestSchema, InstallResponse } from '@aila/model';
import { PasswordHasher } from '../../repositories/user-repository/password-hasher';
import { parseBody } from '../framework/parse-body';
import { UserAttributesRepository } from '../../repositories/user-attributes-repository/user-attributes-repository';
import { UserAttributes } from '../../repositories/user-attributes-repository/user-attributes';
import { Sandbox } from '../../repositories/sandbox-repository/sandbox';
import { SandboxRepository } from '../../repositories/sandbox-repository/sandbox-repository';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class InstallEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/install';

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly userAttributesRepository: UserAttributesRepository,
    private readonly sandboxRepository: SandboxRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  public async handle(req: Request): Promise<InstallResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(installRequestSchema, req.body);

    if ((await this.userRepository.count(abortSignal)) > 0) {
      return {
        error: 'Installation has already been completed'
      };
    }

    const user = await User.create(request.rootUserName, request.rootPassword, true, this.passwordHasher);
    const attributes = UserAttributes.create(user, {});
    const defaultSandbox = Sandbox.create({
      name: 'default',
      description: 'Default sandbox',
      configuration: '',
      isEnabled: true,
      secrets: {}
    });

    await this.userRepository.insert(abortSignal, user);
    await this.userAttributesRepository.replace(abortSignal, attributes);
    await this.sandboxRepository.upsert(abortSignal, defaultSandbox);

    return {};
  }
}

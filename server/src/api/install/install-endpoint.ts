import { Request } from 'express';
import { installRequestSchema, InstallResponse } from '@ailaflow/model';
import { LicenseManager } from '../../configuration/license/license-manager';
import { UserRepository } from '../../repositories/user/user-repository';
import { User } from '../../repositories/user/user';
import { PasswordHasher } from '../../repositories/user/password-hasher';
import { UserAttributesRepository } from '../../repositories/user-attributes/user-attributes-repository';
import { UserAttributes } from '../../repositories/user-attributes/user-attributes';
import { Sandbox } from '../../repositories/sandbox/sandbox';
import { SandboxRepository } from '../../repositories/sandbox/sandbox-repository';
import { Endpoint } from '../framework/endpoint';
import { parseBody } from '../framework/parse-request';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class InstallEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/install';
  private isInstalling = false;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly userAttributesRepository: UserAttributesRepository,
    private readonly sandboxRepository: SandboxRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly licenseManager: LicenseManager
  ) {}

  public async handle(req: Request): Promise<InstallResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(installRequestSchema, req.body);

    if (this.isInstalling) {
      throw new EndpointError('Installation is already in progress', 400);
    }
    this.isInstalling = true;

    try {
      if ((await this.userRepository.count(abortSignal)) > 0) {
        throw new EndpointError('Installation is not allowed because the system is already initialized', 400);
      }

      const isLicenseValid = await this.licenseManager.tryValidateAndSet(abortSignal, request.licenseType, request.licenseKey);
      if (!isLicenseValid) {
        throw new EndpointError('License validation failed', 400);
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
    } finally {
      this.isInstalling = false;
    }
  }
}

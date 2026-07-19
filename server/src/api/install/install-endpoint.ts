import { Request } from 'express';
import { Endpoint } from '../endpoint';
import { UserRepository } from '../../repositories/user-repository/user-repository';
import { User } from '../../repositories/user-repository/user';
import { installRequestSchema, InstallResponse } from '@aila/model';
import { PasswordHasher } from '../../repositories/user-repository/password-hasher';
import { parseBody } from '../parse-body';
import { UserAttributesRepository } from '../../repositories/user-attributes-repository/user-attributes-repository';
import { UserAttributes } from '../../repositories/user-attributes-repository/user-attributes';

export class InstallEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/install';

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly userAttributesRepository: UserAttributesRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  public async handle(req: Request): Promise<InstallResponse> {
    const request = parseBody(installRequestSchema, req.body);

    if ((await this.userRepository.count()) > 0) {
      return {
        error: 'Installation has already been completed'
      };
    }

    const user = await User.create(request.rootUserName, request.rootPassword, true, this.passwordHasher);
    const attributes = UserAttributes.create(user, {});

    await this.userRepository.insert(user);
    await this.userAttributesRepository.replace(attributes);

    return {};
  }
}

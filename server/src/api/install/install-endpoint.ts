import { Request } from 'express';
import { Endpoint } from '../endpoint';
import { User, UserRepository } from '../../repositories/user-repository/user-repository';
import { installRequest, InstallResponse } from '@aila/model';
import { PasswordHasher } from '../../repositories/user-repository/password-hasher';

export class InstallEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/install';

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  public async handle(req: Request): Promise<InstallResponse> {
    const request = installRequest.parse(req.body);

    if ((await this.userRepository.count()) > 0) {
      return {
        error: 'Installation has already been completed'
      };
    }

    const user = await User.create(request.rootUserName, request.rootPassword, true, this.passwordHasher);

    await this.userRepository.insert(user);

    return {};
  }
}

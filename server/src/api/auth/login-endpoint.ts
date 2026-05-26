import { Request } from 'express';
import { Endpoint } from '../endpoint';
import { UserRepository } from '../../repositories/user-repository/user-repository';
import { loginRequest, LoginResponse } from '@aila/model';
import { PasswordHasher } from '../../repositories/user-repository/password-hasher';

export class LoginEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/auth/login';

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  public async handle(req: Request): Promise<LoginResponse> {
    const request = loginRequest.parse(req.body);

    const user = await this.userRepository.tryGetUser(request.userName);
    if (!user) {
      return { success: false };
    }

    if (!user.comparePassword(request.password, this.passwordHasher)) {
      return { success: false };
    }

    return { success: true, token: 'test' };
  }
}

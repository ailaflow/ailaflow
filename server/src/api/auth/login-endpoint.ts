import { Request } from 'express';
import { Endpoint } from '../endpoint';
import { UserRepository } from '../../repositories/user-repository/user-repository';
import { loginRequest, LoginResponse } from '@aila/model';
import { PasswordHasher } from '../../repositories/user-repository/password-hasher';
import { AuthToken, AuthTokenRepository } from '../../repositories/auth-token-repository/auth-token-repository';
import { EndpointError } from '../endpoint-error';

export class LoginEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/auth/login';

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  public async handle(req: Request): Promise<LoginResponse> {
    const request = loginRequest.parse(req.body);

    const user = await this.userRepository.tryGetUser(request.userName);
    if (!user || !(await user.comparePassword(request.password, this.passwordHasher))) {
      throw new EndpointError('Invalid username or password', 401);
    }

    const authToken = await AuthToken.create(user.name);
    await this.authTokenRepository.insert(authToken);

    return { token: authToken.token };
  }
}

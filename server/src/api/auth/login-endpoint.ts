import { Request } from 'express';
import { Endpoint } from '../endpoint';
import { UserRepository } from '../../repositories/user-repository/user-repository';
import { loginRequestSchema, LoginResponse } from '@aila/model';
import { PasswordHasher } from '../../repositories/user-repository/password-hasher';
import { AuthToken, AuthTokenRepository } from '../../repositories/auth-token-repository/auth-token-repository';
import { EndpointError } from '../endpoint-error';
import { parseBody } from '../parse-body';

export class LoginEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/auth/login';

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  public async handle(req: Request): Promise<LoginResponse> {
    const request = parseBody(loginRequestSchema, req.body);

    const user = await this.userRepository.tryGetUser(request.userName);
    if (!user || !(await user.comparePassword(request.password, this.passwordHasher))) {
      throw new EndpointError('Invalid username or password', 401);
    }

    const authToken = await AuthToken.create(user.name, user.isAdmin);
    await this.authTokenRepository.insert(authToken);

    return { userName: user.name, authToken: authToken.token, isAdmin: user.isAdmin };
  }
}

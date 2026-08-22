import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { UserRepository } from '../../repositories/user/user-repository';
import { loginRequestSchema, LoginResponse } from '@aila/model';
import { PasswordHasher } from '../../repositories/user/password-hasher';
import { AuthTokenRepository } from '../../repositories/auth-token/auth-token-repository';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class LoginEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/auth/login';

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  public async handle(req: Request): Promise<LoginResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(loginRequestSchema, req.body);

    const user = await this.userRepository.tryGetUser(abortSignal, request.userName);
    if (!user || !(await user.comparePassword(request.password, this.passwordHasher))) {
      throw new EndpointError('Invalid username or password', 401);
    }

    const authToken = await AuthToken.create(user.name, user.isAdmin);
    await this.authTokenRepository.upsert(abortSignal, authToken);

    return { userName: user.name, authToken: authToken.token, isAdmin: user.isAdmin };
  }
}

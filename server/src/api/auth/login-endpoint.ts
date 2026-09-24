import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { UserRepository } from '../../repositories/user/user-repository';
import { loginRequestSchema, LoginResponse } from '@ailaflow/shared';
import { Cipher } from '../../core/cipher/cipher';
import { AuthTokenRepository } from '../../repositories/auth-token/auth-token-repository';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { LoginThrottler } from './login-throttler';

export class LoginEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/auth/login';

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly loginThrottler: LoginThrottler,
    private readonly cipher: Cipher
  ) {}

  public async handle(req: Request): Promise<LoginResponse> {
    const signal = getEndpointAbortSignal(req);

    const ip = req.ip;
    if (!ip) {
      throw new EndpointError('Unable to determine IP address', 400);
    }
    if (!this.loginThrottler.tryConsumeAttempt(ip)) {
      throw new EndpointError('Too many login attempts, please try again later', 429);
    }

    const request = parseBody(loginRequestSchema, req.body);

    const user = await this.userRepository.tryGetUser(signal, request.userName);
    if (!user || !(await user.comparePassword(request.password, this.cipher))) {
      throw new EndpointError('Invalid username or password', 401);
    }
    if (!user.isActive) {
      throw new EndpointError('User account is deactivated', 403);
    }

    const authToken = await AuthToken.create(user.name, user.isAdmin);
    await this.authTokenRepository.upsert(signal, authToken);

    return { userName: user.name, authToken: authToken.getToken(), isAdmin: user.isAdmin };
  }
}

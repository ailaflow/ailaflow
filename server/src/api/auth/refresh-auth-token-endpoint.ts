import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { refreshTokenRequestSchema, RefreshTokenResponse } from '@ailaflow/shared';
import { AuthTokenRepository } from '../../repositories/auth-token/auth-token-repository';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class RefreshAuthTokenEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/auth/token/refresh';

  public constructor(private readonly authTokenRepository: AuthTokenRepository) {}

  public async handle(req: Request): Promise<RefreshTokenResponse> {
    const signal = getEndpointAbortSignal(req);
    const request = parseBody(refreshTokenRequestSchema, req.body);

    const authToken = await this.authTokenRepository.tryGetByToken(signal, request.authToken);
    if (!authToken || !authToken.tryScheduleExpiration()) {
      throw new EndpointError('Invalid or expired token', 401);
    }

    const newAuthToken = await AuthToken.refresh(authToken);
    await this.authTokenRepository.upsert(signal, newAuthToken);
    await this.authTokenRepository.upsert(signal, authToken);

    return {
      authToken: newAuthToken.token
    };
  }
}

import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { refreshTokenRequestSchema, RefreshTokenResponse } from '@aila/model';
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
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(refreshTokenRequestSchema, req.body);

    const authToken = await this.authTokenRepository.tryGetByToken(abortSignal, request.authToken);
    if (!authToken || !authToken.tryScheduleExpiration()) {
      throw new EndpointError('Invalid or expired token', 401);
    }

    const newAuthToken = await AuthToken.refresh(authToken);
    await this.authTokenRepository.upsert(abortSignal, authToken);
    await this.authTokenRepository.upsert(abortSignal, newAuthToken);

    return {
      authToken: newAuthToken.token
    };
  }
}

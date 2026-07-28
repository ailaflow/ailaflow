import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { refreshTokenRequestSchema, RefreshTokenResponse } from '@aila/model';
import { AuthToken, AuthTokenRepository } from '../../repositories/auth-token/auth-token-repository';
import { EndpointError } from '../framework/endpoint-error';
import { Logger } from '../../core/logger';
import { parseBody } from '../framework/parse-body';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class RefreshAuthTokenEndpoint implements Endpoint {
  private readonly logger = new Logger(RefreshAuthTokenEndpoint.name);

  public readonly method = 'post';
  public readonly path = '/api/auth/token/refresh';

  public constructor(private readonly authTokenRepository: AuthTokenRepository) {}

  public async handle(req: Request): Promise<RefreshTokenResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(refreshTokenRequestSchema, req.body);

    const authToken = await this.authTokenRepository.tryGetByToken(abortSignal, request.authToken);
    if (!authToken || authToken.isExpired()) {
      throw new EndpointError('Invalid or expired token', 401);
    }

    const newAuthToken = await AuthToken.refresh(authToken);
    await this.authTokenRepository.insert(abortSignal, newAuthToken);
    setTimeout(() => this.deleteOldTokenOnBackground(request.authToken), 30_000);

    return {
      authToken: newAuthToken.token
    };
  }

  private async deleteOldTokenOnBackground(token: string) {
    try {
      await this.authTokenRepository.delete(AbortSignal.timeout(8_000), token);
    } catch (e) {
      this.logger.error(`Failed to delete old auth token: ${e}`);
    }
  }
}

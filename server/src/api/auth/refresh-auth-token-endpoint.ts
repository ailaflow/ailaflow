import { Request } from 'express';
import { Endpoint } from '../endpoint';
import { refreshTokenRequest, RefreshTokenResponse } from '@aila/model';
import { AuthToken, AuthTokenRepository } from '../../repositories/auth-token-repository/auth-token-repository';
import { EndpointError } from '../endpoint-error';

export class RefreshAuthTokenEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/auth/token/refresh';

  public constructor(private readonly authTokenRepository: AuthTokenRepository) {}

  public async handle(req: Request): Promise<RefreshTokenResponse> {
    const request = refreshTokenRequest.parse(req.body);

    const authToken = await this.authTokenRepository.tryGetByToken(request.token);
    if (!authToken || authToken.isExpired()) {
      throw new EndpointError('Invalid or expired token', 401);
    }

    const newAuthToken = await AuthToken.create(authToken.userName);
    await this.authTokenRepository.insert(newAuthToken);
    setTimeout(this.deleteOldToken, 30_000);

    return {
      token: newAuthToken.token
    };
  }

  private readonly deleteOldToken = async (token: string) => {
    try {
      await this.authTokenRepository.delete(token);
    } catch {
      // Ignore
    }
  };
}

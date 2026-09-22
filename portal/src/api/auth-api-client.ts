import { HttpClient } from '@aibindkit/react';
import type {
  ExchangeMagicLinkRequest,
  ExchangeMagicLinkResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse
} from '@ailaflow/shared';

export class AuthApiClient {
  public constructor(private readonly client: HttpClient) {}

  public login(signal: AbortSignal, request: LoginRequest): Promise<LoginResponse> {
    return this.client.json(signal, 'POST', '/api/auth/login', request);
  }

  public refreshToken(signal: AbortSignal, request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.client.json(signal, 'POST', '/api/auth/token/refresh', request);
  }

  public exchangeMagicLink(signal: AbortSignal, request: ExchangeMagicLinkRequest): Promise<ExchangeMagicLinkResponse> {
    return this.client.json(signal, 'POST', '/api/auth/magic-link/exchange', request);
  }
}

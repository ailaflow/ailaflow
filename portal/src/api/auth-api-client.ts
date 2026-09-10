import { HttpClient } from '@aibindkit/react';
import type { LoginRequest, LoginResponse, RefreshTokenRequest, RefreshTokenResponse } from '@ailaflow/model';

export class AuthApiClient {
  public constructor(private readonly client: HttpClient) {}

  public login(abortSignal: AbortSignal, request: LoginRequest): Promise<LoginResponse> {
    return this.client.json(abortSignal, 'POST', '/api/auth/login', request);
  }

  public refreshToken(abortSignal: AbortSignal, request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.client.json(abortSignal, 'POST', '/api/auth/token/refresh', request);
  }
}

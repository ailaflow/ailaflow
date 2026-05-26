import { HttpClient } from './http-client';
import { LoginRequest, LoginResponse, RefreshTokenRequest, RefreshTokenResponse } from '@aila/model';

export class ApiClient {
  private readonly client = new HttpClient('');

  public setOnUnauthorizedListener(listener: (() => void) | null) {
    this.client.setOnUnauthorizedListener(listener);
  }

  public readonly auth = new AuthApiClient(this.client);
}

export class AuthApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async login(request: LoginRequest): Promise<LoginResponse> {
    return this.client.json({
      method: 'POST',
      path: '/auth/login',
      body: request
    });
  }

  public async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.client.json({
      method: 'POST',
      path: '/auth/token/refresh',
      body: request
    });
  }
}

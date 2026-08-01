import { HttpClient } from '@aibindkit/react';
import type { GetUserResponse, GetUsersResponse, SaveUserRequest, SaveUserResponse } from '@aila/model';

export class UserApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getUsers(abortSignal: AbortSignal): Promise<GetUsersResponse> {
    return this.client.json(abortSignal, 'GET', '/api/users');
  }

  public getUser(abortSignal: AbortSignal, name: string): Promise<GetUserResponse> {
    return this.client.json(abortSignal, 'GET', `/api/users/${encodeURIComponent(name)}`);
  }

  public saveUser(abortSignal: AbortSignal, request: SaveUserRequest): Promise<SaveUserResponse> {
    return this.client.json(abortSignal, 'POST', '/api/user', request);
  }
}

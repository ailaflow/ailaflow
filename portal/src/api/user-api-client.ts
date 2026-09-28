import { HttpClient } from '@aibindkit/react';
import type {
  DeleteTelegramBotResponse,
  GetTelegramConfigurationResponse,
  GetUserResponse,
  GetUsersRequest,
  GetUsersResponse,
  SaveTelegramBotRequest,
  SaveTelegramBotResponse,
  SaveUserRequest,
  SaveUserResponse
} from '@ailaflow/shared';

export class UserApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getUsers(signal: AbortSignal, request: GetUsersRequest): Promise<GetUsersResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    if (request.onlyActive) {
      query.set('onlyActive', '1');
    }
    if (request.search !== undefined) {
      query.set('search', request.search);
    }
    return this.client.json(signal, 'GET', `/api/users?${query}`);
  }

  public getUser(signal: AbortSignal, name: string): Promise<GetUserResponse> {
    return this.client.json(signal, 'GET', `/api/users/${name}`);
  }

  public saveUser(signal: AbortSignal, request: SaveUserRequest): Promise<SaveUserResponse> {
    return this.client.json(signal, 'POST', '/api/user', request);
  }

  public getTelegramConfiguration(signal: AbortSignal, userName: string): Promise<GetTelegramConfigurationResponse> {
    return this.client.json(signal, 'GET', `/api/users/${userName}/telegram`);
  }

  public saveTelegramBot(signal: AbortSignal, userName: string, request: SaveTelegramBotRequest): Promise<SaveTelegramBotResponse> {
    return this.client.json(signal, 'POST', `/api/users/${userName}/telegram`, request);
  }

  public deleteTelegramBot(signal: AbortSignal, userName: string, channelName: string): Promise<DeleteTelegramBotResponse> {
    return this.client.json(signal, 'DELETE', `/api/users/${userName}/telegram/${encodeURIComponent(channelName)}`);
  }
}

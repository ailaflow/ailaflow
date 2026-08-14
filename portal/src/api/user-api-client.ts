import { HttpClient } from '@aibindkit/react';
import type {
  DeleteTelegramBotResponse,
  GetTelegramConfigurationResponse,
  GetUserResponse,
  GetUsersResponse,
  SaveTelegramBotRequest,
  SaveTelegramBotResponse,
  SaveUserRequest,
  SaveUserResponse
} from '@aila/model';

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

  public getTelegramConfiguration(abortSignal: AbortSignal, userName: string): Promise<GetTelegramConfigurationResponse> {
    return this.client.json(abortSignal, 'GET', `/api/users/${encodeURIComponent(userName)}/telegram`);
  }

  public saveTelegramBot(abortSignal: AbortSignal, userName: string, request: SaveTelegramBotRequest): Promise<SaveTelegramBotResponse> {
    return this.client.json(abortSignal, 'POST', `/api/users/${encodeURIComponent(userName)}/telegram`, request);
  }

  public deleteTelegramBot(abortSignal: AbortSignal, userName: string, channelName: string): Promise<DeleteTelegramBotResponse> {
    return this.client.json(
      abortSignal,
      'DELETE',
      `/api/users/${encodeURIComponent(userName)}/telegram/${encodeURIComponent(channelName)}`
    );
  }
}

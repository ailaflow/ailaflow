import { HttpClient } from '@aibindkit/react';
import type {
  DeleteSlackConfigurationResponse,
  GetSlackConfigurationResponse,
  GetSlackUsersRequest,
  GetSlackUsersResponse,
  RefreshSlackUsersResponse,
  SaveSlackConfigurationRequest,
  SaveSlackConfigurationResponse,
  SaveSlackMappingsRequest,
  SaveSlackMappingsResponse
} from '@ailaflow/shared';

export class SlackConfigurationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public get(signal: AbortSignal): Promise<GetSlackConfigurationResponse> {
    return this.client.json(signal, 'GET', '/api/slack-configuration');
  }

  public save(signal: AbortSignal, request: SaveSlackConfigurationRequest): Promise<SaveSlackConfigurationResponse> {
    return this.client.json(signal, 'POST', '/api/slack-configuration', request);
  }

  public delete(signal: AbortSignal): Promise<DeleteSlackConfigurationResponse> {
    return this.client.json(signal, 'DELETE', '/api/slack-configuration');
  }

  public getUsers(signal: AbortSignal, request: GetSlackUsersRequest): Promise<GetSlackUsersResponse> {
    const query = new URLSearchParams({ page: String(request.page), pageSize: String(request.pageSize) });
    if (request.search) {
      query.set('search', request.search);
    }
    return this.client.json(signal, 'GET', `/api/slack-configuration/users?${query}`);
  }

  public refreshUsers(signal: AbortSignal): Promise<RefreshSlackUsersResponse> {
    return this.client.json(signal, 'POST', '/api/slack-configuration/users/refresh', {});
  }

  public saveMappings(signal: AbortSignal, request: SaveSlackMappingsRequest): Promise<SaveSlackMappingsResponse> {
    return this.client.json(signal, 'POST', '/api/slack-configuration/mappings', request);
  }
}

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

  public get(abortSignal: AbortSignal): Promise<GetSlackConfigurationResponse> {
    return this.client.json(abortSignal, 'GET', '/api/slack-configuration');
  }

  public save(abortSignal: AbortSignal, request: SaveSlackConfigurationRequest): Promise<SaveSlackConfigurationResponse> {
    return this.client.json(abortSignal, 'POST', '/api/slack-configuration', request);
  }

  public delete(abortSignal: AbortSignal): Promise<DeleteSlackConfigurationResponse> {
    return this.client.json(abortSignal, 'DELETE', '/api/slack-configuration');
  }

  public getUsers(abortSignal: AbortSignal, request: GetSlackUsersRequest): Promise<GetSlackUsersResponse> {
    const query = new URLSearchParams({ page: String(request.page), pageSize: String(request.pageSize) });
    if (request.search) {
      query.set('search', request.search);
    }
    return this.client.json(abortSignal, 'GET', `/api/slack-configuration/users?${query}`);
  }

  public refreshUsers(abortSignal: AbortSignal): Promise<RefreshSlackUsersResponse> {
    return this.client.json(abortSignal, 'POST', '/api/slack-configuration/users/refresh', {});
  }

  public saveMappings(abortSignal: AbortSignal, request: SaveSlackMappingsRequest): Promise<SaveSlackMappingsResponse> {
    return this.client.json(abortSignal, 'POST', '/api/slack-configuration/mappings', request);
  }
}

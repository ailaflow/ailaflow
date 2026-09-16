import { HttpClient } from '@aibindkit/react';
import type { MySlackConfigurationResponse } from '@ailaflow/shared';

export class MySlackConfigurationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public get(abortSignal: AbortSignal): Promise<MySlackConfigurationResponse> {
    return this.client.json(abortSignal, 'GET', '/api/my-slack-configuration');
  }
}

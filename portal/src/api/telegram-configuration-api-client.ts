import { HttpClient } from '@aibindkit/react';
import type {
  DeleteTelegramBotResponse,
  GetTelegramConfigurationResponse,
  SaveTelegramBotRequest,
  SaveTelegramBotResponse
} from '@ailaflow/shared';

export class TelegramConfigurationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public get(signal: AbortSignal): Promise<GetTelegramConfigurationResponse> {
    return this.client.json(signal, 'GET', '/api/my-configuration/telegram');
  }

  public save(signal: AbortSignal, request: SaveTelegramBotRequest): Promise<SaveTelegramBotResponse> {
    return this.client.json(signal, 'POST', '/api/my-configuration/telegram', request);
  }

  public delete(signal: AbortSignal, channelName: string): Promise<DeleteTelegramBotResponse> {
    return this.client.json(signal, 'DELETE', `/api/my-configuration/telegram/${encodeURIComponent(channelName)}`);
  }
}

import { HttpClient } from '@aibindkit/react';
import type {
  DeleteTelegramBotResponse,
  GetTelegramConfigurationResponse,
  SaveTelegramBotRequest,
  SaveTelegramBotResponse
} from '@aila/model';

export class TelegramConfigurationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public get(abortSignal: AbortSignal): Promise<GetTelegramConfigurationResponse> {
    return this.client.json(abortSignal, 'GET', '/api/my-configuration/telegram');
  }

  public save(abortSignal: AbortSignal, request: SaveTelegramBotRequest): Promise<SaveTelegramBotResponse> {
    return this.client.json(abortSignal, 'POST', '/api/my-configuration/telegram', request);
  }

  public delete(abortSignal: AbortSignal, channelName: string): Promise<DeleteTelegramBotResponse> {
    return this.client.json(abortSignal, 'DELETE', `/api/my-configuration/telegram/${encodeURIComponent(channelName)}`);
  }
}

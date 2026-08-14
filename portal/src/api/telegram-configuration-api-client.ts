import { HttpClient } from '@aibindkit/react';
import type {
  DeleteMyTelegramBotResponse,
  GetMyTelegramConfigurationResponse,
  SaveMyTelegramBotRequest,
  SaveMyTelegramBotResponse
} from '@aila/model';

export class TelegramConfigurationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public get(abortSignal: AbortSignal): Promise<GetMyTelegramConfigurationResponse> {
    return this.client.json(abortSignal, 'GET', '/api/my-telegram-configuration');
  }

  public save(abortSignal: AbortSignal, request: SaveMyTelegramBotRequest): Promise<SaveMyTelegramBotResponse> {
    return this.client.json(abortSignal, 'POST', '/api/my-telegram-bot', request);
  }

  public delete(abortSignal: AbortSignal, channelName: string): Promise<DeleteMyTelegramBotResponse> {
    return this.client.json(abortSignal, 'DELETE', `/api/my-telegram-bots/${encodeURIComponent(channelName)}`);
  }
}

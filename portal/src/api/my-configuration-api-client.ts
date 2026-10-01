import { HttpClient } from '@aibindkit/react';
import type {
  ChangeMyPasswordRequest,
  ChangeMyPasswordResponse,
  DeleteMyChannelResponse,
  DeleteTelegramBotResponse,
  GetMyChannelsResponse,
  GetTelegramConfigurationResponse,
  MySlackConfigurationResponse,
  SaveMyChannelRequest,
  SaveMyChannelResponse,
  SaveTelegramBotRequest,
  SaveTelegramBotResponse
} from '@ailaflow/shared';

export class MyConfigurationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getTelegramConfiguration(signal: AbortSignal): Promise<GetTelegramConfigurationResponse> {
    return this.client.json(signal, 'GET', '/api/my-configuration/telegram');
  }

  public getChannels(signal: AbortSignal): Promise<GetMyChannelsResponse> {
    return this.client.json(signal, 'GET', '/api/my-configuration/channels');
  }

  public saveChannel(signal: AbortSignal, request: SaveMyChannelRequest): Promise<SaveMyChannelResponse> {
    return this.client.json(signal, 'POST', '/api/my-configuration/channels', request);
  }

  public deleteChannel(signal: AbortSignal, name: string): Promise<DeleteMyChannelResponse> {
    return this.client.json(signal, 'DELETE', `/api/my-configuration/channels/${name}`);
  }

  public saveTelegramBot(signal: AbortSignal, request: SaveTelegramBotRequest): Promise<SaveTelegramBotResponse> {
    return this.client.json(signal, 'POST', '/api/my-configuration/telegram', request);
  }

  public deleteTelegramBot(signal: AbortSignal, channelName: string): Promise<DeleteTelegramBotResponse> {
    return this.client.json(signal, 'DELETE', `/api/my-configuration/telegram/${encodeURIComponent(channelName)}`);
  }

  public getSlackConfiguration(signal: AbortSignal): Promise<MySlackConfigurationResponse> {
    return this.client.json(signal, 'GET', '/api/my-configuration/slack');
  }

  public changePassword(signal: AbortSignal, request: ChangeMyPasswordRequest): Promise<ChangeMyPasswordResponse> {
    return this.client.json(signal, 'POST', '/api/my-configuration/password', request);
  }
}

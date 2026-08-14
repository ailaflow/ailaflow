import { GetMyTelegramConfigurationResponse } from '@aila/model';
import { Request } from 'express';
import { TelegramConfigurationRepository } from '../../repositories/telegram-configuration/telegram-configuration-repository';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetMyTelegramConfigurationEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-telegram-configuration';
  public readonly auth = true;

  public constructor(private readonly repository: TelegramConfigurationRepository) {}

  public async handle(req: Request): Promise<GetMyTelegramConfigurationResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const configurations = await this.repository.getForUser(abortSignal, userName);
    return {
      bots: configurations.map(configuration => ({
        channelName: configuration.channelName,
        hasBotToken: configuration.botToken.length > 0,
        botUserName: configuration.botUserName,
        isConnected: configuration.telegramChatId !== null,
        linkCode: configuration.telegramChatId === null ? configuration.linkCode : null
      }))
    };
  }
}

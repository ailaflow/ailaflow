import type {
  DeleteTelegramBotResponse,
  GetTelegramConfigurationResponse,
  SaveTelegramBotRequest,
  SaveTelegramBotResponse,
  TelegramBotConfigurationDto
} from '@aila/model';
import { randomBytes } from 'crypto';
import { EventBus } from '../../events/event-bus';
import { TelegramConfigurationChangedEvent } from '../../events/telegram-configuration/telegram-configuration-changed-event';
import {
  TelegramBotConfiguration,
  TelegramBotConfigurationError
} from '../../repositories/telegram-configuration/telegram-bot-configuration';
import {
  TelegramConfigurationRepository,
  TelegramConfigurationRepositoryError
} from '../../repositories/telegram-configuration/telegram-configuration-repository';
import { TelegramBotApiClient, TelegramBotApiError } from '../../telegram/telegram-bot-api-client';
import { EndpointError } from '../framework/endpoint-error';

export class TelegramConfigurationApi {
  public constructor(
    private readonly repository: TelegramConfigurationRepository,
    private readonly client: TelegramBotApiClient,
    private readonly eventBus: EventBus
  ) {}

  public async get(abortSignal: AbortSignal, userName: string): Promise<GetTelegramConfigurationResponse> {
    const configurations = await this.repository.getForUser(abortSignal, userName);
    return { bots: configurations.map(toDto) };
  }

  public async save(abortSignal: AbortSignal, userName: string, request: SaveTelegramBotRequest): Promise<SaveTelegramBotResponse> {
    const existing = await this.repository.tryGet(abortSignal, userName, request.channelName);
    const botToken = request.botToken ?? existing?.botToken;

    if (!botToken) {
      throw new EndpointError('Bot token is required', 400);
    }

    try {
      const identity = await this.client.getMe(abortSignal, botToken);
      if (!identity.username) {
        throw new EndpointError('Telegram bot does not have a username', 400);
      }
      const webhook = await this.client.getWebhookInfo(abortSignal, botToken);
      if (webhook.url) {
        throw new EndpointError('Telegram bot has a webhook configured; remove it before connecting it to Aila', 400);
      }

      const isSameBot = existing?.botId === String(identity.id);
      const reconnect = request.reconnect === true;
      const telegramChatId = isSameBot && !reconnect ? existing.telegramChatId : null;
      const configuration = TelegramBotConfiguration.create(userName, request.channelName, botToken, {
        botId: String(identity.id),
        botUserName: identity.username,
        telegramChatId,
        linkCode: telegramChatId === null ? (isSameBot && !reconnect && existing.linkCode ? existing.linkCode : createLinkCode()) : null,
        lastUpdateId: isSameBot ? existing.lastUpdateId : null
      });
      await this.repository.upsert(abortSignal, configuration);
      await this.eventBus.publish(new TelegramConfigurationChangedEvent(userName, request.channelName));
      return { bot: toDto(configuration) };
    } catch (error) {
      if (error instanceof EndpointError) {
        throw error;
      }
      if (error instanceof TelegramBotApiError && (error.errorCode === 401 || error.errorCode === 404)) {
        throw new EndpointError('Incorrect Telegram bot token', 400);
      }
      if (error instanceof TelegramBotConfigurationError || error instanceof TelegramConfigurationRepositoryError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
  }

  public async delete(abortSignal: AbortSignal, userName: string, channelName: string): Promise<DeleteTelegramBotResponse> {
    const deleted = await this.repository.delete(abortSignal, userName, channelName);
    if (!deleted) {
      throw new EndpointError('Telegram bot configuration not found', 404);
    }
    await this.eventBus.publish(new TelegramConfigurationChangedEvent(userName, channelName));
    return { channelName };
  }
}

function toDto(configuration: TelegramBotConfiguration): TelegramBotConfigurationDto {
  return {
    channelName: configuration.channelName,
    hasBotToken: configuration.botToken.length > 0,
    botUserName: configuration.botUserName,
    isConnected: configuration.telegramChatId !== null,
    linkCode: configuration.telegramChatId === null ? configuration.linkCode : null
  };
}

function createLinkCode(): string {
  return randomBytes(24).toString('base64url');
}

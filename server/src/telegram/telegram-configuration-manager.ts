import type {
  DeleteTelegramBotResponse,
  GetTelegramConfigurationResponse,
  SaveTelegramBotRequest,
  SaveTelegramBotResponse,
  TelegramBotConfigurationDto
} from '@ailaflow/shared';
import { randomBytes } from 'crypto';
import { EventBus } from '../events/event-bus';
import { TelegramConfigurationChangedEvent } from '../events/telegram-configuration/telegram-configuration-changed-event';
import { TelegramBotConfiguration, TelegramBotConfigurationError } from '../repositories/configuration/telegram/telegram-bot-configuration';
import {
  TelegramConfigurationRepository,
  TelegramConfigurationRepositoryError
} from '../repositories/configuration/telegram/telegram-configuration-repository';
import { TelegramBotApiClient, TelegramBotApiError } from './telegram-bot-api-client';
import { TelegramConfigurationError, TelegramConfigurationErrorReason } from './telegram-configuration-error';

export class TelegramConfigurationManager {
  public constructor(
    private readonly repository: TelegramConfigurationRepository,
    private readonly client: TelegramBotApiClient,
    private readonly eventBus: EventBus
  ) {}

  public async get(signal: AbortSignal, userName: string): Promise<GetTelegramConfigurationResponse> {
    const configurations = await this.repository.getForUser(signal, userName);
    return { bots: configurations.map(toDto) };
  }

  public async save(signal: AbortSignal, userName: string, request: SaveTelegramBotRequest): Promise<SaveTelegramBotResponse> {
    const existing = await this.repository.tryGet(signal, userName, request.channelName);
    const botToken = request.botToken ?? existing?.botToken;

    if (!botToken) {
      throw new TelegramConfigurationError(TelegramConfigurationErrorReason.INVALID_CONFIGURATION, 'Bot token is required');
    }

    try {
      const identity = await this.client.getMe(signal, botToken);
      if (!identity.username) {
        throw new TelegramConfigurationError(
          TelegramConfigurationErrorReason.INVALID_CONFIGURATION,
          'Telegram bot does not have a username'
        );
      }
      const webhook = await this.client.getWebhookInfo(signal, botToken);
      if (webhook.url) {
        throw new TelegramConfigurationError(
          TelegramConfigurationErrorReason.INVALID_CONFIGURATION,
          'Telegram bot has a webhook configured; remove it before connecting it to AilaFlow'
        );
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
      await this.repository.upsert(signal, configuration);
      await this.eventBus.publish(new TelegramConfigurationChangedEvent(userName, request.channelName));
      return { bot: toDto(configuration) };
    } catch (error) {
      if (error instanceof TelegramConfigurationError) {
        throw error;
      }
      if (error instanceof TelegramBotApiError && (error.errorCode === 401 || error.errorCode === 404)) {
        throw new TelegramConfigurationError(TelegramConfigurationErrorReason.CREDENTIALS_REJECTED, 'Incorrect Telegram bot token');
      }
      if (error instanceof TelegramBotConfigurationError || error instanceof TelegramConfigurationRepositoryError) {
        throw new TelegramConfigurationError(TelegramConfigurationErrorReason.INVALID_CONFIGURATION, error.message);
      }
      throw error;
    }
  }

  public async delete(signal: AbortSignal, userName: string, channelName: string): Promise<DeleteTelegramBotResponse> {
    const deleted = await this.repository.delete(signal, userName, channelName);
    if (!deleted) {
      throw new TelegramConfigurationError(
        TelegramConfigurationErrorReason.CONFIGURATION_NOT_FOUND,
        'Telegram bot configuration not found'
      );
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

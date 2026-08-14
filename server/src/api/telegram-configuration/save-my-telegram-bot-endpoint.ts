import { SaveMyTelegramBotResponse, saveMyTelegramBotRequestSchema } from '@aila/model';
import { randomBytes } from 'crypto';
import { Request } from 'express';
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
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class SaveMyTelegramBotEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-telegram-bot';
  public readonly auth = true;

  public constructor(
    private readonly repository: TelegramConfigurationRepository,
    private readonly client: TelegramBotApiClient,
    private readonly eventBus: EventBus
  ) {}

  public async handle(req: Request): Promise<SaveMyTelegramBotResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const request = parseBody(saveMyTelegramBotRequestSchema, req.body);
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
        linkCode: telegramChatId ? null : isSameBot && !reconnect && existing.linkCode ? existing.linkCode : createLinkCode(),
        lastUpdateId: isSameBot ? existing.lastUpdateId : null
      });
      await this.repository.upsert(abortSignal, configuration);
      await this.eventBus.publish(new TelegramConfigurationChangedEvent(userName, request.channelName));
      return {
        bot: {
          channelName: configuration.channelName,
          hasBotToken: true,
          botUserName: configuration.botUserName,
          isConnected: configuration.telegramChatId !== null,
          linkCode: configuration.telegramChatId === null ? configuration.linkCode : null
        }
      };
    } catch (error) {
      if (error instanceof TelegramBotApiError && (error.errorCode === 401 || error.errorCode === 404)) {
        throw new EndpointError('Incorrect Telegram bot token', 400);
      }
      if (error instanceof TelegramBotConfigurationError || error instanceof TelegramConfigurationRepositoryError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
  }
}

function createLinkCode(): string {
  return randomBytes(24).toString('base64url');
}

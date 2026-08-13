import { saveMyTelegramBotRequestSchema } from '@aila/model';
import { Request } from 'express';
import {
  TelegramBotConfiguration,
  TelegramBotConfigurationError
} from '../../repositories/telegram-configuration/telegram-bot-configuration';
import { TelegramConfigurationRepository } from '../../repositories/telegram-configuration/telegram-configuration-repository';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class SaveMyTelegramBotEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-telegram-bot';
  public readonly auth = true;

  public constructor(private readonly repository: TelegramConfigurationRepository) {}

  public async handle(req: Request): Promise<object> {
    const abortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const request = parseBody(saveMyTelegramBotRequestSchema, req.body);
    const existing = await this.repository.tryGet(abortSignal, userName, request.channelName);
    const botToken = request.botToken ?? existing?.botToken;

    if (!botToken) {
      throw new EndpointError('Bot token is required', 400);
    }

    // Telegram token verification belongs here. It is intentionally deferred until
    // the Telegram client is introduced; verification errors should become 400s.
    try {
      const configuration = TelegramBotConfiguration.create(userName, request.channelName, botToken);
      await this.repository.upsert(abortSignal, configuration);
      return {};
    } catch (error) {
      if (error instanceof TelegramBotConfigurationError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
  }
}

import type { SaveTelegramBotResponse } from '@ailaflow/shared';
import { saveTelegramBotRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { TelegramConfigurationManager } from '../../telegram/telegram-configuration-manager';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';
import { mapTelegramEndpointErrors } from '../telegram-configuration/telegram-endpoint-error-mapper';

export class SaveMyTelegramBotEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-configuration/telegram';
  public readonly auth = true;

  public constructor(private readonly manager: TelegramConfigurationManager) {}

  public async handle(req: Request): Promise<SaveTelegramBotResponse> {
    const signal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const request = parseBody(saveTelegramBotRequestSchema, req.body);
    return mapTelegramEndpointErrors(() => this.manager.save(signal, userName, request));
  }
}

import type { SaveTelegramBotResponse } from '@ailaflow/model';
import { saveTelegramBotRequestSchema } from '@ailaflow/model';
import { Request } from 'express';
import { TelegramConfigurationApi } from '../common/telegram-configuration-api';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';

export class SaveMyTelegramBotEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-configuration/telegram';
  public readonly auth = true;

  public constructor(private readonly api: TelegramConfigurationApi) {}

  public async handle(req: Request): Promise<SaveTelegramBotResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const request = parseBody(saveTelegramBotRequestSchema, req.body);
    return this.api.save(abortSignal, userName, request);
  }
}

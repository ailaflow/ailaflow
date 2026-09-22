import type { DeleteTelegramBotResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { TelegramConfigurationApi } from '../common/telegram-configuration-api';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class DeleteMyTelegramBotEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/my-configuration/telegram/:channelName';
  public readonly auth = true;

  public constructor(private readonly api: TelegramConfigurationApi) {}

  public async handle(req: Request): Promise<DeleteTelegramBotResponse> {
    const signal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const channelName = String(req.params.channelName);
    return this.api.delete(signal, userName, channelName);
  }
}

import type { DeleteTelegramBotResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { TelegramConfigurationManager } from '../../telegram/telegram-configuration-manager';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { mapTelegramEndpointErrors } from '../telegram-configuration/telegram-endpoint-error-mapper';

export class DeleteMyTelegramBotEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/my-configuration/telegram/:channelName';
  public readonly auth = true;

  public constructor(private readonly manager: TelegramConfigurationManager) {}

  public async handle(req: Request): Promise<DeleteTelegramBotResponse> {
    const signal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const channelName = String(req.params.channelName);
    return mapTelegramEndpointErrors(() => this.manager.delete(signal, userName, channelName));
  }
}

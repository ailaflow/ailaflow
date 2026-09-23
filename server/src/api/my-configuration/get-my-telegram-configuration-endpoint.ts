import type { GetTelegramConfigurationResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { TelegramConfigurationManager } from '../../telegram/telegram-configuration-manager';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { mapTelegramEndpointErrors } from '../telegram-configuration/telegram-endpoint-error-mapper';

export class GetMyTelegramConfigurationEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-configuration/telegram';
  public readonly auth = true;

  public constructor(private readonly manager: TelegramConfigurationManager) {}

  public async handle(req: Request): Promise<GetTelegramConfigurationResponse> {
    const signal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    return mapTelegramEndpointErrors(() => this.manager.get(signal, userName));
  }
}

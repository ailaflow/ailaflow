import type { GetTelegramConfigurationResponse } from '@ailaflow/model';
import { Request } from 'express';
import { TelegramConfigurationApi } from '../common/telegram-configuration-api';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetMyTelegramConfigurationEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-configuration/telegram';
  public readonly auth = true;

  public constructor(private readonly api: TelegramConfigurationApi) {}

  public async handle(req: Request): Promise<GetTelegramConfigurationResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    return this.api.get(abortSignal, userName);
  }
}

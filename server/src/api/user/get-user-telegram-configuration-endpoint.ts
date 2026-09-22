import type { GetTelegramConfigurationResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { UserRepository } from '../../repositories/user/user-repository';
import { TelegramConfigurationApi } from '../common/telegram-configuration-api';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class GetUserTelegramConfigurationEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/users/:userName/telegram';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly api: TelegramConfigurationApi
  ) {}

  public async handle(req: Request): Promise<GetTelegramConfigurationResponse> {
    const signal = getEndpointAbortSignal(req);
    const userName = String(req.params.userName);
    const user = await this.userRepository.tryGetUser(signal, userName);
    if (!user) {
      throw new EndpointError('User not found', 404);
    }
    return this.api.get(signal, user.name);
  }
}

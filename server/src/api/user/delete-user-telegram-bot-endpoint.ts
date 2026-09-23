import type { DeleteTelegramBotResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { UserRepository } from '../../repositories/user/user-repository';
import { TelegramConfigurationManager } from '../../telegram/telegram-configuration-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { mapTelegramEndpointErrors } from '../telegram-configuration/telegram-endpoint-error-mapper';

export class DeleteUserTelegramBotEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/users/:userName/telegram/:channelName';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly manager: TelegramConfigurationManager
  ) {}

  public async handle(req: Request): Promise<DeleteTelegramBotResponse> {
    const signal = getEndpointAbortSignal(req);
    const userName = String(req.params.userName);
    const user = await this.userRepository.tryGetUser(signal, userName);
    if (!user) {
      throw new EndpointError('User not found', 404);
    }
    const channelName = String(req.params.channelName);
    return mapTelegramEndpointErrors(() => this.manager.delete(signal, user.name, channelName));
  }
}

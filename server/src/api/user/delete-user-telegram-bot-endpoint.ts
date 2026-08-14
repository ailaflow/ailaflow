import type { DeleteTelegramBotResponse } from '@aila/model';
import { Request } from 'express';
import { UserRepository } from '../../repositories/user/user-repository';
import { TelegramConfigurationApi } from '../common/telegram-configuration-api';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class DeleteUserTelegramBotEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/users/:userName/telegram/:channelName';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly api: TelegramConfigurationApi
  ) {}

  public async handle(req: Request): Promise<DeleteTelegramBotResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const userName = String(req.params.userName);
    const user = await this.userRepository.tryGetUser(abortSignal, userName);
    if (!user) {
      throw new EndpointError('User not found', 404);
    }
    const channelName = String(req.params.channelName);
    return this.api.delete(abortSignal, user.name, channelName);
  }
}

import type { SaveTelegramBotResponse } from '@ailaflow/shared';
import { saveTelegramBotRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { UserRepository } from '../../repositories/user/user-repository';
import { TelegramConfigurationManager } from '../../telegram/telegram-configuration-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';
import { mapTelegramEndpointErrors } from '../telegram-configuration/telegram-endpoint-error-mapper';

export class SaveUserTelegramBotEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/users/:userName/telegram';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly manager: TelegramConfigurationManager
  ) {}

  public async handle(req: Request): Promise<SaveTelegramBotResponse> {
    const signal = getEndpointAbortSignal(req);
    const userName = String(req.params.userName);
    const user = await this.userRepository.tryGetUser(signal, userName);
    if (!user) {
      throw new EndpointError('User not found', 404);
    }
    const request = parseBody(saveTelegramBotRequestSchema, req.body);
    return mapTelegramEndpointErrors(() => this.manager.save(signal, user.name, request));
  }
}

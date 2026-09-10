import type { SaveTelegramBotResponse } from '@ailaflow/model';
import { saveTelegramBotRequestSchema } from '@ailaflow/model';
import { Request } from 'express';
import { UserRepository } from '../../repositories/user/user-repository';
import { TelegramConfigurationApi } from '../common/telegram-configuration-api';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class SaveUserTelegramBotEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/users/:userName/telegram';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly api: TelegramConfigurationApi
  ) {}

  public async handle(req: Request): Promise<SaveTelegramBotResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const userName = String(req.params.userName);
    const user = await this.userRepository.tryGetUser(abortSignal, userName);
    if (!user) {
      throw new EndpointError('User not found', 404);
    }
    const request = parseBody(saveTelegramBotRequestSchema, req.body);
    return this.api.save(abortSignal, user.name, request);
  }
}

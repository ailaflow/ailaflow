import { DeleteMyTelegramBotResponse } from '@aila/model';
import { Request } from 'express';
import { EventBus } from '../../events/event-bus';
import { TelegramConfigurationChangedEvent } from '../../events/telegram-configuration/telegram-configuration-changed-event';
import { TelegramConfigurationRepository } from '../../repositories/telegram-configuration/telegram-configuration-repository';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class DeleteMyTelegramBotEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/my-telegram-bots/:channelName';
  public readonly auth = true;

  public constructor(
    private readonly repository: TelegramConfigurationRepository,
    private readonly eventBus: EventBus
  ) {}

  public async handle(req: Request): Promise<DeleteMyTelegramBotResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const channelName = String(req.params.channelName);
    const deleted = await this.repository.delete(abortSignal, userName, channelName);
    if (!deleted) {
      throw new EndpointError('Telegram bot configuration not found', 404);
    }
    await this.eventBus.publish(new TelegramConfigurationChangedEvent(userName, channelName));
    return { channelName };
  }
}

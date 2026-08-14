import { TelegramSynchronizationManager } from '../../telegram/telegram-synchronization-manager';
import { EventHandler } from '../event-handler';
import { TelegramConfigurationChangedEvent } from './telegram-configuration-changed-event';

export class TelegramConfigurationChangedEventHandler implements EventHandler<TelegramConfigurationChangedEvent> {
  public readonly name = TelegramConfigurationChangedEvent.name;

  public constructor(private readonly telegramSynchronizationManager: TelegramSynchronizationManager) {}

  public async handle(event: TelegramConfigurationChangedEvent): Promise<void> {
    await this.telegramSynchronizationManager.reload(AbortSignal.timeout(10_000), event.userName, event.channelName);
  }
}

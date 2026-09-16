import { SlackSynchronizationManager } from '../../slack/slack-synchronization-manager';
import { EventHandler } from '../event-handler';
import { SlackConfigurationChangedEvent } from './slack-configuration-changed-event';

export class SlackConfigurationChangedEventHandler implements EventHandler<SlackConfigurationChangedEvent> {
  public readonly name = SlackConfigurationChangedEvent.name;

  public constructor(private readonly manager: SlackSynchronizationManager) {}

  public async handle(): Promise<void> {
    await this.manager.reloadConfiguration();
  }
}

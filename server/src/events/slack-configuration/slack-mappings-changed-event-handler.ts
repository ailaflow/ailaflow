import { SlackSynchronizationManager } from '../../slack/slack-synchronization-manager';
import { EventHandler } from '../event-handler';
import { SlackMappingsChangedEvent } from './slack-mappings-changed-event';

export class SlackMappingsChangedEventHandler implements EventHandler<SlackMappingsChangedEvent> {
  public readonly name = SlackMappingsChangedEvent.name;

  public constructor(private readonly manager: SlackSynchronizationManager) {}

  public async handle(): Promise<void> {
    await this.manager.reloadMappings();
  }
}

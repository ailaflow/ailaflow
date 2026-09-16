import { Event } from '../event';

export class SlackConfigurationChangedEvent implements Event {
  public readonly name = SlackConfigurationChangedEvent.name;
}

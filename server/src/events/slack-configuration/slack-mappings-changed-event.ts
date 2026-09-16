import { Event } from '../event';

export class SlackMappingsChangedEvent implements Event {
  public readonly name = SlackMappingsChangedEvent.name;
}

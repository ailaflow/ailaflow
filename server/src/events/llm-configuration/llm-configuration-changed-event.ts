import { Event } from '../event';

export class LlmConfigurationChangedEvent implements Event {
  public readonly name = LlmConfigurationChangedEvent.name;

  public constructor() {}
}

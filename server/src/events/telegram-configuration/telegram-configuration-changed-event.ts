import { Event } from '../event';

export class TelegramConfigurationChangedEvent implements Event {
  public readonly name = TelegramConfigurationChangedEvent.name;

  public constructor(
    public readonly userName: string,
    public readonly channelName: string
  ) {}
}

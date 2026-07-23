import { Event } from './event';

export interface EventHandler<E extends Event = Event> {
  name: E['name'];
  handle(event: E): Promise<void>;
}

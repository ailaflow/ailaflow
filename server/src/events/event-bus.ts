import { Logger } from '../core/logger';
import { Event } from './event';
import { EventHandler } from './event-handler';

export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private readonly handlers: Map<string, EventHandler[]> = new Map();

  public registerHandler<E extends Event>(handle: EventHandler<E>) {
    let handlers = this.handlers.get(handle.constructor.name);
    if (!handlers) {
      handlers = [];
      this.handlers.set(handle.name, handlers);
    }
    handlers.push(handle);
  }

  public async publish(event: Event) {
    const handlers = this.handlers.get(event.constructor.name);
    if (handlers) {
      for (const handler of handlers) {
        void this.handle(event, handler);
      }
    }
  }

  private async handle(event: Event, handler: EventHandler) {
    try {
      await handler.handle(event);
    } catch (e) {
      this.logger.error(`Error handling event ${event.name}: ${e}`);
    }
  }
}

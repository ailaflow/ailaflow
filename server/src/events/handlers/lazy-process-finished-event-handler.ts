import { LiveChatSessionStore } from '@aibindkit/express';
import { EventHandler } from '../event-handler';
import { LazyProcessFinishedEvent } from './lazy-process-finished-event';
import { Logger } from '../../core/logger';
import { ChatSessionId } from '../../chat-session/chat-session-id';

export class LazyProcessFinishedEventHandler implements EventHandler<LazyProcessFinishedEvent> {
  public readonly name = LazyProcessFinishedEvent.name;
  private readonly logger = new Logger(LazyProcessFinishedEventHandler.name);

  public constructor(private readonly liveSessionStore: LiveChatSessionStore) {}

  public async handle(event: LazyProcessFinishedEvent) {
    const sessionId = ChatSessionId.createUserMainChannel(event.userName).serialize();
    const session = this.liveSessionStore.tryGetById(sessionId);
    if (!session) {
      this.logger.log(`Cannot find session: ${sessionId}`);
      return;
    }

    let message = `Process "${event.processName}" finished the execution ${event.executionId},`;
    if (event.result.success) {
      message += ` successfully, output: ${JSON.stringify(event.result.output)}`;
    } else {
      message += ` with an error: ${event.result.error}`;
    }
    session.queueUserMessage(message, {
      internal: true
    });
  }
}

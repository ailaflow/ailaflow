import { ChatSessionStore } from '@aibindkit/express';
import { ChatSessionIdProvider } from '../../chat-session/chat-session-id-provider';
import { EventHandler } from '../event-handler';
import { LazyProcessFinishedEvent } from './lazy-process-finished-event';
import { Logger } from '../../core/logger';

export class LazyProcessFinishedEventHandler implements EventHandler<LazyProcessFinishedEvent> {
  public readonly name = LazyProcessFinishedEvent.name;
  private readonly logger = new Logger(LazyProcessFinishedEventHandler.name);

  public constructor(
    private readonly sessionIdProvider: ChatSessionIdProvider,
    private readonly sessionStore: ChatSessionStore
  ) {}

  public async handle(event: LazyProcessFinishedEvent) {
    const sessionId = this.sessionIdProvider.getUserDefaultChannel(event.userName);
    const session = this.sessionStore.tryGetById(sessionId);
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
    session.queueUserMessage(message);
  }
}

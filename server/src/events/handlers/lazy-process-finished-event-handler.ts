import { EventHandler } from '../event-handler';
import { LazyProcessFinishedEvent } from './lazy-process-finished-event';
import { Logger } from '../../core/logger';
import { UserChatSessionProvider } from '../../providers/user-chat-session-provider';

export class LazyProcessFinishedEventHandler implements EventHandler<LazyProcessFinishedEvent> {
  public readonly name = LazyProcessFinishedEvent.name;
  private readonly logger = new Logger(LazyProcessFinishedEventHandler.name);

  public constructor(private readonly userChatSessionProvider: UserChatSessionProvider) {}

  public async handle(event: LazyProcessFinishedEvent) {
    const session = this.userChatSessionProvider.tryGetMainChannel(event.userName);
    if (!session) {
      this.logger.log(`Cannot find main chat session for user: ${event.userName}`);
      return;
    }

    let m = `>>>>>>>>\nProcess "${event.processName}" finished the execution ${event.executionId}`;
    if (event.result.success) {
      m += ` successfully, output: ${JSON.stringify(event.result.output)}`;
    } else {
      m += ` with an error: ${event.result.error}`;
    }
    m += `\n<<<<<<<<`;
    session.queueUserMessage(m, {
      internal: true
    });
  }
}

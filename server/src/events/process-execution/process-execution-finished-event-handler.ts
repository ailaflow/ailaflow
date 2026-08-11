import { EventHandler } from '../event-handler';
import { ProcessExecutionFinishedEvent } from './process-execution-finished-event';
import { Logger } from '../../core/logger';
import { UserChatSessionProvider } from '../../chat-session/user-chat-session-provider';

export class ProcessExecutionFinishedEventHandler implements EventHandler<ProcessExecutionFinishedEvent> {
  public readonly name = ProcessExecutionFinishedEvent.name;
  private readonly logger = new Logger(ProcessExecutionFinishedEventHandler.name);

  public constructor(private readonly userChatSessionProvider: UserChatSessionProvider) {}

  public async handle(event: ProcessExecutionFinishedEvent) {
    const session = this.userChatSessionProvider.tryGetMainChannel(event.startedBy);
    if (!session) {
      this.logger.log(`Cannot find main chat session for user: ${event.startedBy}`);
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

import { EventHandler } from '../event-handler';
import { ProcessExecutionFinishedEvent } from './process-execution-finished-event';
import { UserChatSessionProvider } from '../../chat-session/user-chat-session-provider';
import { ChatSessionId } from '../../chat-session/chat-session-id';

export class ProcessExecutionFinishedEventHandler implements EventHandler<ProcessExecutionFinishedEvent> {
  public readonly name = ProcessExecutionFinishedEvent.name;

  public constructor(private readonly userChatSessionProvider: UserChatSessionProvider) {}

  public async handle(event: ProcessExecutionFinishedEvent) {
    if (!event.context.chatSessionId) {
      return;
    }
    const abortSignal = AbortSignal.timeout(3_000);

    const sessionId = ChatSessionId.decode(event.context.chatSessionId);
    const session = await this.userChatSessionProvider.get(abortSignal, sessionId.isTest(), sessionId.userName, sessionId.channelName);

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

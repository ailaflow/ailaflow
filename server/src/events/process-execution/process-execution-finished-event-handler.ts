import { EventHandler } from '../event-handler';
import { ProcessExecutionFinishedEvent } from './process-execution-finished-event';
import { UserChatSessionProvider } from '../../chat-session/user-chat-session-provider';

export class ProcessExecutionFinishedEventHandler implements EventHandler<ProcessExecutionFinishedEvent> {
  public readonly name = ProcessExecutionFinishedEvent.name;

  public constructor(private readonly userChatSessionProvider: UserChatSessionProvider) {}

  public async handle(event: ProcessExecutionFinishedEvent) {
    const session = await this.userChatSessionProvider.getDefault(AbortSignal.timeout(3_000), event.startedBy);

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

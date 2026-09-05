import { EventHandler } from '../event-handler';
import { ProcessExecutionFinishedEvent } from './process-execution-finished-event';
import { UserChatSessionProvider } from '../../chat-session/user-chat-session-provider';
import { ChatSessionId } from '../../chat-session/chat-session-id';
import { AdminChatSessionProvider } from '../../chat-session/admin-chat-session-provider';

export class ProcessExecutionFinishedEventHandler implements EventHandler<ProcessExecutionFinishedEvent> {
  public readonly name = ProcessExecutionFinishedEvent.name;

  public constructor(
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly adminChatSessionProvider: AdminChatSessionProvider
  ) {}

  public async handle(event: ProcessExecutionFinishedEvent) {
    const abortSignal = AbortSignal.timeout(5_000);
    const session = await this.tryGetSession(abortSignal, event);
    if (!session) {
      return;
    }

    let m = '>>>>>>>>\n';
    m += `Process "${event.processName}" has finished. Execution ID: "${event.executionId}"\n`;
    m += `Result: ${event.result.success ? 'success' : 'error'}\n`;
    if (event.result.success) {
      m += 'Output:\n```json\n';
      m += JSON.stringify(event.result.output, null, 2) + '\n';
      m += '```\n';
    } else if (event.result.stepId) {
      m += `Error at step ${event.result.stepId}: ${event.result.error}\n`;
    } else {
      m += `Error: ${event.result.error}\n`;
    }
    m += `<<<<<<<<`;
    session.queueUserMessage(m, {
      internal: true
    });
  }

  private async tryGetSession(abortSignal: AbortSignal, event: ProcessExecutionFinishedEvent) {
    if (!event.context.chatSessionId) {
      return undefined;
    }

    const sessionId = ChatSessionId.decode(event.context.chatSessionId);
    if (sessionId.isAdmin()) {
      return this.adminChatSessionProvider.tryGet(sessionId.userName);
    }

    return await this.userChatSessionProvider.get(abortSignal, sessionId.isTest(), sessionId.userName, sessionId.channelName);
  }
}

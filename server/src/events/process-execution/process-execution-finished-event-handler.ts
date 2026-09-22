import { EventHandler } from '../event-handler';
import { ProcessExecutionFinishedEvent } from './process-execution-finished-event';
import { UserChatSessionProvider } from '../../chat-session/user-chat-session-provider';
import { ChatSessionId } from '../../chat-session/chat-session-id';
import { AdminChatSessionProvider } from '../../chat-session/admin-chat-session-provider';
import { ProcessExecutionOutcomeType } from '@ailaflow/shared';

export class ProcessExecutionFinishedEventHandler implements EventHandler<ProcessExecutionFinishedEvent> {
  public readonly name = ProcessExecutionFinishedEvent.name;

  public constructor(
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly adminChatSessionProvider: AdminChatSessionProvider
  ) {}

  public async handle(event: ProcessExecutionFinishedEvent) {
    const signal = AbortSignal.timeout(5_000);
    const session = await this.tryGetSession(signal, event);
    if (!session) {
      return;
    }

    let m = '>>>>>>>>\n';
    m += `Execution "${event.executionId}" for process "/${event.processName}" `;

    if (event.outcome.type === ProcessExecutionOutcomeType.FINISHED) {
      m += 'finished successfully.\n';
      m += 'Output:\n```json\n';
      m += JSON.stringify(event.outcome.output, null, 2) + '\n';
      m += '```\n';
    } else if (event.outcome.type === ProcessExecutionOutcomeType.PAUSED) {
      m += 'was paused';
      if (event.outcome.stepId) {
        m += ` at step "${event.outcome.stepId}"`;
      }
      m += '.\n';
    } else if (event.outcome.type === ProcessExecutionOutcomeType.FAILED) {
      m += 'failed';
      if (event.outcome.stepId) {
        m += ` at step "${event.outcome.stepId}"`;
      }
      m += `: ${event.outcome.error}\n`;
    }
    m += '<<<<<<<<';
    session.queueUserMessage(m, {
      internal: true
    });
  }

  private async tryGetSession(signal: AbortSignal, event: ProcessExecutionFinishedEvent) {
    if (!event.context.chatSessionId) {
      return undefined;
    }

    const sessionId = ChatSessionId.decode(event.context.chatSessionId);
    if (sessionId.isAdmin()) {
      return this.adminChatSessionProvider.tryGet(sessionId.userName);
    }

    return await this.userChatSessionProvider.get(signal, sessionId.isTest(), sessionId.userName, sessionId.channelName);
  }
}

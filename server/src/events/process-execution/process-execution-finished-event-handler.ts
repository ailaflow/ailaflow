import { EventHandler } from '../event-handler';
import { ProcessExecutionFinishedEvent } from './process-execution-finished-event';
import { ChatSessionId } from '../../chat-session/chat-session-id';
import { ProcessExecutionOutcomeType } from '@ailaflow/shared';
import { Notifier } from '../../notification/notifier';

export class ProcessExecutionFinishedEventHandler implements EventHandler<ProcessExecutionFinishedEvent> {
  public readonly name = ProcessExecutionFinishedEvent.name;

  public constructor(private readonly notifier: Notifier) {}

  public async handle(event: ProcessExecutionFinishedEvent) {
    const signal = AbortSignal.timeout(5_000);

    let m = `Execution "${event.executionId}" for process "/${event.processName}" `;

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

    await this.notifier.notifyUser(
      signal,
      event.context.chatSessionId ? ChatSessionId.decode(event.context.chatSessionId) : null,
      event.processName,
      event.context.isTest,
      event.context.startedBy,
      m
    );
  }
}

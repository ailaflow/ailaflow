import { EventHandler } from '../event-handler';
import { ProcessExecutionOutcomeAvailableEvent } from '../../process-executor/process-execution-outcome-available-event';
import { ChatSessionId } from '../../chat-session/chat-session-id';
import { ProcessExecutionOutcomeType, ProcessReturnFormMessageMetadata } from '@ailaflow/shared';
import { Notifier } from '../../notification/notifier';
import { ChatMessageMetadata } from '@aibindkit/core';
import { ProcessManager } from '../../process/process-manager';

export class ProcessExecutionOutcomeAvailableEventHandler implements EventHandler<ProcessExecutionOutcomeAvailableEvent> {
  public readonly name = ProcessExecutionOutcomeAvailableEvent.name;

  public constructor(
    private readonly notifier: Notifier,
    private readonly processManager: ProcessManager
  ) {}

  public async handle(event: ProcessExecutionOutcomeAvailableEvent) {
    const signal = AbortSignal.timeout(5_000);

    let n = `Execution "${event.executionId}" for process /${event.processName} `;
    let cd: string | null = null;
    let metadata: ChatMessageMetadata | undefined = undefined;

    if (event.outcome.type === ProcessExecutionOutcomeType.FINISHED) {
      n += 'finished successfully';
      const keys = Object.keys(event.outcome.output);
      if (keys.length > 0) {
        cd = 'Output:\n```json\n';
        cd += JSON.stringify(event.outcome.output) + '\n';
        cd += '```';
      } else {
        cd = 'No output was produced.';
      }

      if (event.outcome.interruptedStepId) {
        const process = await this.processManager.tryGetByName(signal, event.processName);
        if (process) {
          const hasForm = Boolean(process.forms.findOutputFormByReturnStepId(event.outcome.interruptedStepId));
          metadata = {
            processReturnForm: {
              name: event.processName,
              stepId: event.outcome.interruptedStepId,
              hasForm
            } satisfies ProcessReturnFormMessageMetadata
          };
        }
      }
    } else if (event.outcome.type === ProcessExecutionOutcomeType.PAUSED) {
      n += 'was paused';
      if (event.outcome.stepId) {
        n += ` at step "${event.outcome.stepId}"`;
      }
    } else if (event.outcome.type === ProcessExecutionOutcomeType.FAILED) {
      n += 'failed';
      if (event.outcome.stepId) {
        n += ` at step "${event.outcome.stepId}"`;
      }
      n += `: ${event.outcome.error}`;
    }

    // TODO: we should save the outcome to the event that the user could see the output values including on form.
    await this.notifier.notifyUser(
      signal,
      event.context.chatSessionId ? ChatSessionId.decode(event.context.chatSessionId) : null,
      event.processName,
      event.context.isTest,
      event.context.startedBy,
      n,
      cd,
      metadata
    );
  }
}

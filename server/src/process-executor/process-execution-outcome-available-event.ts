import { Event } from '../events/event';
import { ProcessExecutionContext } from './process-execution-context';
import { ProcessExecutionOutcome } from '@ailaflow/shared';

export class ProcessExecutionOutcomeAvailableEvent implements Event {
  public readonly name = ProcessExecutionOutcomeAvailableEvent.name;

  public constructor(
    public readonly executionId: string,
    public readonly context: ProcessExecutionContext,
    public readonly isResumed: boolean,
    public readonly processName: string,
    public readonly outcome: ProcessExecutionOutcome
  ) {}
}

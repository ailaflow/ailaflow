import { Event } from '../event';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';
import { ProcessExecutionOutcome } from '@ailaflow/shared';

export class ProcessExecutionFinishedEvent implements Event {
  public readonly name = ProcessExecutionFinishedEvent.name;

  public constructor(
    public readonly executionId: string,
    public readonly context: ProcessExecutionContext,
    public readonly processName: string,
    public readonly outcome: ProcessExecutionOutcome
  ) {}
}

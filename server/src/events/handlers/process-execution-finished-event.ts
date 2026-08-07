import { ProcessExecutionResult } from '@aila/model';
import { Event } from '../event';

export class ProcessExecutionFinishedEvent implements Event {
  public readonly name = ProcessExecutionFinishedEvent.name;

  public constructor(
    public readonly executionId: string,
    public readonly startedBy: string,
    public readonly processName: string,
    public readonly result: ProcessExecutionResult
  ) {}
}

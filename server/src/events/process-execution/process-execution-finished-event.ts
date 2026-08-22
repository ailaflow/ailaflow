import { ProcessExecutionResult } from '@aila/model';
import { Event } from '../event';
import { ProcessExecutionOrigin } from '../../process-executor/process-execution';

export class ProcessExecutionFinishedEvent implements Event {
  public readonly name = ProcessExecutionFinishedEvent.name;

  public constructor(
    public readonly executionId: string,
    public readonly origin: ProcessExecutionOrigin,
    public readonly processName: string,
    public readonly result: ProcessExecutionResult
  ) {}
}

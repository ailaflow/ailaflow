import { ProcessExecutionResult } from '@aila/model';
import { Event } from '../event';

export class LazyProcessFinishedEvent implements Event {
  public readonly name = LazyProcessFinishedEvent.name;

  public constructor(
    public readonly userName: string,
    public readonly executionId: string,
    public readonly processName: string,
    public readonly result: ProcessExecutionResult
  ) {}
}

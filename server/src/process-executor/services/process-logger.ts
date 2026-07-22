import { SimpleEvent } from '@aibindkit/core';
import { ProcessLog, ProcessLogLevel } from '@aila/model';

export class ProcessLogger {
  public readonly onLog = new SimpleEvent<ProcessLog>();

  public info(message: string) {
    this.onLog.emit([Date.now(), ProcessLogLevel.INFO, message]);
  }
}

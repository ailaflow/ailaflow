import { SimpleEvent } from '@aibindkit/core';

export interface WorkflowLog {
  level: 'info' | 'warning' | 'error';
  message: string;
}

export class WorkflowLogger {
  public readonly onLog = new SimpleEvent<WorkflowLog>();

  public info(message: string) {
    this.onLog.emit({ level: 'info', message });
  }
}

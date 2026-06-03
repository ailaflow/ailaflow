import { Ev } from '../../core/ev';

export interface WorkflowLog {
  level: 'info' | 'warning' | 'error';
  message: string;
}

export class WorkflowLogger {
  public readonly onLog = new Ev<WorkflowLog>();

  public info(message: string) {
    this.onLog.emit({ level: 'info', message });
  }
}

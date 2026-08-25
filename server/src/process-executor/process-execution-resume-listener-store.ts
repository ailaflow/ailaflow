import { ProcessExecution } from './process-execution';

export type ProcessExecutionResumeListener = (execution: ProcessExecution) => void;

export class ProcessExecutionResumeListenerStore {
  private readonly listeners = new Map<string, ProcessExecutionResumeListener>();

  public set(executionId: string, listener: ProcessExecutionResumeListener) {
    this.listeners.set(executionId, listener);
  }

  public tryGet(executionId: string): ProcessExecutionResumeListener | undefined {
    return this.listeners.get(executionId);
  }

  public delete(executionId: string) {
    this.listeners.delete(executionId);
  }
}

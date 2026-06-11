import { ProcessExecution } from './process-execution';

export class ProcessExecutionStore {
  private readonly executions = new Map<string, ProcessExecution>();

  public set(executionId: string, execution: ProcessExecution) {
    this.executions.set(executionId, execution);
  }

  public get(executionId: string): ProcessExecution {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Cannot find the execution: ${executionId}`);
    }
    return execution;
  }

  public delete(executionId: string) {
    this.executions.delete(executionId);
  }
}

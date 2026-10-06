import { ProcessExecution } from './process-execution';

export class ProcessExecutionStore {
  private readonly executions = new Map<string, ProcessExecution>();

  public bind(execution: ProcessExecution) {
    const cleanup = () => {
      this.executions.delete(execution.id);
    };

    this.executions.set(execution.id, execution);
    execution.onOutcome.once(cleanup);
  }

  public get(executionId: string): ProcessExecution {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Cannot find the execution: ${executionId}`);
    }
    return execution;
  }
}

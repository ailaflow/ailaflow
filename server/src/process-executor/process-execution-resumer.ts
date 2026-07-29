import { SignalPayload } from 'sequential-workflow-machine';
import { ProcessRepository } from '../repositories/process/process-repository';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { ProcessExecution } from './process-execution';
import { ProcessExecutor } from './process-executor';

export class ProcessExecutionResumeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = ProcessExecutionResumeError.name;
  }
}

export class ProcessExecutionResumer {
  public constructor(
    private readonly processRepository: ProcessRepository,
    private readonly persistedExecutionRepository: PersistedExecutionRepository,
    private readonly processExecutor: ProcessExecutor
  ) {}

  public async resume(abortSignal: AbortSignal, executionId: string, payload: SignalPayload): Promise<ProcessExecution> {
    const persistedExecution = await this.persistedExecutionRepository.tryGet(abortSignal, executionId);
    if (!persistedExecution) {
      throw new ProcessExecutionResumeError(`Cannot find the persisted execution: ${executionId}`);
    }

    const process = await this.processRepository.tryGetByName(abortSignal, persistedExecution.processName);
    if (!process) {
      throw new ProcessExecutionResumeError(`Cannot find the process: ${persistedExecution.processName}`);
    }
    if (process.hash !== persistedExecution.processHash) {
      throw new ProcessExecutionResumeError('Cannot resume execution because the process definition changed');
    }

    const execution = this.processExecutor.restore(process, persistedExecution.state);
    await this.persistedExecutionRepository.delete(abortSignal, executionId);
    execution.run(abortSignal, {
      signalOnFirstWait: payload
    });

    return execution;
  }
}

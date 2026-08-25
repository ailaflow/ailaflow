import { SignalPayload } from 'sequential-workflow-machine';
import { ProcessRepository } from '../repositories/process/process-repository';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { ProcessExecution } from './process-execution';
import { ProcessExecutor } from './process-executor';
import { EventBus } from '../events/event-bus';
import { ProcessExecutionFinishedEvent } from '../events/process-execution/process-execution-finished-event';
import { ProcessExecutionResumeListenerStore } from './process-execution-resume-listener-store';

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
    private readonly processExecutor: ProcessExecutor,
    private readonly resumeListenerStore: ProcessExecutionResumeListenerStore,
    private readonly eventBus: EventBus
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

    const execution = this.processExecutor.restore(
      persistedExecution.executionId,
      persistedExecution.context,
      process,
      persistedExecution.state
    );
    execution.onFinished.subscribe(result => {
      this.eventBus.publish(
        new ProcessExecutionFinishedEvent(persistedExecution.executionId, execution.context, persistedExecution.processName, result)
      );
    });

    await this.persistedExecutionRepository.delete(abortSignal, executionId);

    const listener = this.resumeListenerStore.tryGet(executionId);
    if (listener) {
      listener(execution);
    }

    execution.run(abortSignal, {
      signalOnFirstWait: payload
    });

    return execution;
  }
}

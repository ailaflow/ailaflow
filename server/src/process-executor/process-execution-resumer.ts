import { SignalPayload } from 'sequential-workflow-machine';
import { ProcessManager } from '../process/process-manager';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { ProcessExecution } from './process-execution';
import { ProcessExecutor } from './process-executor';
import { EventBus } from '../events/event-bus';
import { ProcessExecutionFinishedEvent } from '../events/process-execution/process-execution-finished-event';
import { ProcessExecutionResumeListenerStore } from './process-execution-resume-listener-store';
import { Logger } from '../core/logger';

export class ProcessExecutionResumeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = ProcessExecutionResumeError.name;
  }
}

export class ProcessExecutionResumer {
  private readonly logger = new Logger(ProcessExecutionResumer.name);

  public constructor(
    private readonly processManager: ProcessManager,
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

    const process = await this.processManager.tryGetByName(abortSignal, persistedExecution.processName);
    if (!process) {
      throw new ProcessExecutionResumeError(`Cannot find the process: ${persistedExecution.processName}`);
    }
    if (process.hash !== persistedExecution.processHash) {
      // TODO: this may cause issues, we should consider how to handle this case.
      this.logger.warn(
        `Reassuming execution ${executionId} with a different process hash ${persistedExecution.processHash} != ${process.hash}`
      );
    }

    const execution = this.processExecutor.restore(
      persistedExecution.executionId,
      persistedExecution.context,
      process,
      persistedExecution.state
    );
    execution.onOutcome.subscribe(outcome => {
      this.eventBus.publish(
        new ProcessExecutionFinishedEvent(persistedExecution.executionId, execution.context, persistedExecution.processName, outcome)
      );
    });

    await this.persistedExecutionRepository.delete(abortSignal, executionId);

    const listener = this.resumeListenerStore.tryGet(executionId);
    if (listener) {
      listener(execution);
    }

    execution.run(payload);

    return execution;
  }
}

import { SignalPayload, WorkflowMachineInterpreter, signalSignalActivity } from 'sequential-workflow-machine';
import { ProcessLogger } from './services/process-logger';
import { ProcessExecutionGlobalState } from './process-execution-global-state';
import { SimpleEvent } from '@aibindkit/core';
import { ProcessVariableManager } from './services/process-variable-manager';
import { ProcessExecutionOutcome, ProcessExecutionOutcomeType, ProcessExecutionVariableValues, ProcessLog } from '@ailaflow/shared';
import { ProcessExecutionPersister } from './process-execution-persister';
import type { Process } from '../repositories/process/process';
import { ProcessExecutionContext } from './process-execution-context';
import { ProcessExecutor } from './process-executor';
import { DefinitionWalker, Step } from 'sequential-workflow-model';

const WAIT_FOR_SIGNAL_STATE = 'WAIT_FOR_SIGNAL';

type ProcessExecutionSnapshot = ReturnType<WorkflowMachineInterpreter<ProcessExecutionGlobalState>['getSnapshot']>;

enum ProcessExecutionState {
  IDLE,
  RUNNING,
  COMPLETED
}

export class ProcessExecution {
  public readonly onCurrentStepChanged = new SimpleEvent<string | null>();
  public readonly onOutcome = new SimpleEvent<ProcessExecutionOutcome>();
  public readonly onLog = new SimpleEvent<ProcessLog>();

  private signalOnFirstWait?: SignalPayload;
  private state = ProcessExecutionState.IDLE;

  public constructor(
    public readonly id: string,
    public readonly context: ProcessExecutionContext,
    private readonly stopController: AbortController,
    private readonly process: Process,
    private readonly interpreter: WorkflowMachineInterpreter<ProcessExecutionGlobalState>,
    private readonly logger: ProcessLogger,
    private readonly variableManager: ProcessVariableManager,
    private readonly processExecutionPersister: ProcessExecutionPersister,
    private readonly processExecutor: ProcessExecutor
  ) {}

  // control

  public run(signalOnFirstWait?: SignalPayload) {
    if (this.state !== ProcessExecutionState.IDLE) {
      throw new Error('The execution is not idle');
    }

    this.signalOnFirstWait = signalOnFirstWait;
    this.state = ProcessExecutionState.RUNNING;

    this.interpreter.onChange(this.onChange);
    this.interpreter.onDone(this.onDone);
    this.logger.onLog.subscribe(this.onLog.emit);
    this.interpreter.start();
  }

  /**
   * Runs the execution. The soft signal DOES NOT stop the execution but only the waiting for an outcome.
   * @returns `null` if the waiting for an outcome was interrupted by the soft signal, otherwise the outcome of the process execution.
   */
  public runAndWaitForOutcome(softSignal: AbortSignal): Promise<ProcessExecutionOutcome | null> {
    return new Promise(resolve => {
      if (softSignal.aborted) {
        this.run();
        resolve(null);
        return;
      }

      const onOutcome = (outcome: ProcessExecutionOutcome) => {
        softSignal.removeEventListener('abort', onSoftTimeout);
        resolve(outcome);
      };
      const onSoftTimeout = () => {
        this.onOutcome.unsubscribe(onOutcome);
        resolve(null);
      };

      softSignal.addEventListener('abort', onSoftTimeout, {
        once: true
      });
      this.onOutcome.subscribe(onOutcome);
      this.run();
    });
  }

  public isWorking(): boolean {
    return this.state === ProcessExecutionState.RUNNING;
  }

  /**
   * Starts the stop procedure.
   */
  public stop() {
    if (this.state !== ProcessExecutionState.RUNNING) {
      throw new Error('The execution is not running');
    }
    this.stopController.abort();
  }

  public tryStop(): boolean {
    if (this.state === ProcessExecutionState.RUNNING && !this.stopController.signal.aborted) {
      this.stopController.abort();
      return true;
    }
    return false;
  }

  // state api

  public readVariable(name: string): unknown | null {
    return this.variableManager.get(name);
  }

  public writeVariable(name: string, value: unknown) {
    this.variableManager.set(name, value);
  }

  public getUserAccessExpression(): string {
    return this.process.userAccessExpression;
  }

  public initializeSubExecution(process: Process, input: ProcessExecutionVariableValues): ProcessExecution {
    const parentProcessNames = this.context.parentProcessNames
      ? [...this.context.parentProcessNames, this.process.name]
      : [this.process.name];

    return this.processExecutor.initialize(
      {
        startedBy: this.context.startedBy,
        isTest: this.context.isTest,
        parentProcessNames
      },
      process,
      input
    );
  }

  public getCurrentlyExecutingStep<S extends Step>(): S {
    const snapshot = this.interpreter.getSnapshot();
    const currentStepId = snapshot.tryGetCurrentStepId();
    if (!currentStepId) {
      throw new Error('No current executing step found');
    }
    const walker = new DefinitionWalker();
    const step = walker.findById(this.process.definition, currentStepId);
    if (!step) {
      throw new Error(`Step with ID ${currentStepId} not found`);
    }
    return step as S;
  }

  // private methods

  private complete(outcome: ProcessExecutionOutcome) {
    this.state = ProcessExecutionState.COMPLETED;
    this.onOutcome.emit(outcome);
  }

  private readonly onChange = () => {
    if (!this.isWorking()) {
      return;
    }

    if (this.stopController.signal.aborted) {
      this.interpreter.tryStop();
    } else {
      const snapshot = this.interpreter.getSnapshot();
      const currentStepId = snapshot.tryGetCurrentStepId();
      this.onCurrentStepChanged.emit(currentStepId);

      if (this.isWaitingForSignal(snapshot)) {
        if (this.signalOnFirstWait) {
          const payload = this.signalOnFirstWait;
          this.signalOnFirstWait = undefined;
          signalSignalActivity(this.interpreter, payload);
          return;
        }
        void this.pause(currentStepId);
      }
    }
  };

  private readonly onDone = () => {
    if (!this.isWorking()) {
      return;
    }

    if (this.stopController.signal.aborted) {
      this.complete({
        type: ProcessExecutionOutcomeType.FAILED,
        error: 'The execution was manually stopped'
      });
      return;
    }

    const snapshot = this.interpreter.getSnapshot();
    if (snapshot.isFailed()) {
      this.complete({
        type: ProcessExecutionOutcomeType.FAILED,
        error: snapshot.unhandledError?.message ?? 'Unknown unhandled error',
        stepId: snapshot.unhandledError?.stepId
      });
      return;
    }
    if (snapshot.isInterrupted()) {
      if (snapshot.globalState.result) {
        this.complete({
          type: ProcessExecutionOutcomeType.FINISHED,
          output: this.variableManager.getMultiple(snapshot.globalState.result.outputVariableNames),
          interruptedStepId: snapshot.globalState.result.stepId
        });
        return;
      }

      this.complete({
        type: ProcessExecutionOutcomeType.FAILED,
        error: 'Unknown interrupted error'
      });
      return;
    }
    if (snapshot.isFinished()) {
      this.complete({
        type: ProcessExecutionOutcomeType.FINISHED,
        output: {}
      });
      return;
    }

    this.complete({
      type: ProcessExecutionOutcomeType.FAILED,
      error: 'Unknown error'
    });
  };

  private isWaitingForSignal(snapshot: ProcessExecutionSnapshot): boolean {
    return snapshot.getStatePaths().some(path => path.includes(WAIT_FOR_SIGNAL_STATE));
  }

  private async pause(currentStepId: string | null): Promise<void> {
    if (!this.isWorking()) {
      return;
    }
    this.state = ProcessExecutionState.COMPLETED;

    const serializedSnapshot = this.interpreter.serializeSnapshot();
    try {
      await this.processExecutionPersister.persist(this.process, this, serializedSnapshot);
      this.complete({
        type: ProcessExecutionOutcomeType.PAUSED,
        stepId: currentStepId
      });
    } catch (e) {
      this.complete({
        type: ProcessExecutionOutcomeType.FAILED,
        error: `Could not persist paused execution: ${(e as Error).message}`,
        stepId: currentStepId
      });
    } finally {
      this.interpreter.tryStop();
    }
  }
}

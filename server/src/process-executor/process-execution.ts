import {
  SerializedWorkflowMachineSnapshot,
  SignalPayload,
  WorkflowMachineInterpreter,
  signalSignalActivity
} from 'sequential-workflow-machine';
import { ProcessLogger } from './services/process-logger';
import { ProcessExecutionGlobalState } from './process-execution-global-state';
import { SimpleEvent } from '@aibindkit/core';
import { ProcessVariableManager } from './services/process-variable-manager';
import { ProcessExecutionResult, ProcessLog } from '@ailaflow/shared';
import { ProcessExecutionPersister } from './process-execution-persister';
import type { Process } from '../repositories/process/process';
import { ProcessExecutionContext } from './process-execution-context';
import { ProcessExecutor } from './process-executor';

const WAIT_FOR_SIGNAL_STATE = 'WAIT_FOR_SIGNAL';

type ProcessExecutionSnapshot = ReturnType<WorkflowMachineInterpreter<ProcessExecutionGlobalState>['getSnapshot']>;

export interface ProcessExecutionRunOptions {
  signalOnFirstWait?: SignalPayload;
}

export class ProcessExecution {
  public readonly onCurrentStepChanged = new SimpleEvent<string | null>();
  public readonly onFinished = new SimpleEvent<ProcessExecutionResult>();
  public readonly onPaused = new SimpleEvent<void>();
  public readonly onLog = new SimpleEvent<ProcessLog>();
  private paused = false;

  public constructor(
    public readonly id: string,
    public readonly context: ProcessExecutionContext,
    private readonly process: Process,
    private readonly interpreter: WorkflowMachineInterpreter<ProcessExecutionGlobalState>,
    private readonly logger: ProcessLogger,
    private readonly variableManager: ProcessVariableManager,
    private readonly processExecutionPersister: ProcessExecutionPersister,
    private readonly processExecutor: ProcessExecutor
  ) {}

  private resolveResult(): ProcessExecutionResult {
    const snapshot = this.interpreter.getSnapshot();
    if (snapshot.isFailed()) {
      if (snapshot.unhandledError) {
        return {
          success: false,
          error: snapshot.unhandledError.message,
          stepId: snapshot.unhandledError.stepId
        };
      }
      return {
        success: false,
        error: 'Unknown unhandled error'
      };
    }
    if (snapshot.isInterrupted()) {
      if (snapshot.globalState.result) {
        return {
          success: true,
          output: this.variableManager.getMultiple(snapshot.globalState.result.outputVariableNames),
          stepId: snapshot.globalState.result.stepId
        };
      }
      return {
        success: false,
        error: 'Unknown interrupted error'
      };
    }
    if (snapshot.isFinished()) {
      return {
        success: true,
        output: {}
      };
    }
    return {
      success: false,
      error: 'Maximum allowed time exceeded'
    };
  }

  private isWaitingForSignal(snapshot: ProcessExecutionSnapshot): boolean {
    return snapshot.getStatePaths().some(path => path.includes(WAIT_FOR_SIGNAL_STATE));
  }

  private async pause(
    currentStepId: string | null,
    serializedSnapshot: SerializedWorkflowMachineSnapshot<ProcessExecutionGlobalState>
  ): Promise<void> {
    if (this.paused) {
      return;
    }
    this.paused = true;
    try {
      await this.processExecutionPersister.persist(this.process, this, serializedSnapshot);
      this.onPaused.emit();
    } catch (e) {
      this.onFinished.emit({
        success: false,
        error: `Could not persist paused execution: ${(e as Error).message}`,
        stepId: currentStepId
      });
    } finally {
      this.interpreter.tryStop();
    }
  }

  public run(abortSignal: AbortSignal, options: ProcessExecutionRunOptions = {}) {
    let signalOnFirstWait = options.signalOnFirstWait;

    this.interpreter.onChange(() => {
      if (abortSignal.aborted) {
        this.interpreter.tryStop();
      } else {
        const snapshot = this.interpreter.getSnapshot();
        const currentStepId = snapshot.tryGetCurrentStepId();
        this.onCurrentStepChanged.emit(currentStepId);

        if (this.isWaitingForSignal(snapshot)) {
          if (signalOnFirstWait) {
            const payload = signalOnFirstWait;
            signalOnFirstWait = undefined;
            signalSignalActivity(this.interpreter, payload);
            return;
          }
          void this.pause(currentStepId, this.interpreter.serializeSnapshot());
        }
      }
    });

    this.interpreter.onDone(() => {
      if (this.paused) {
        return;
      }
      const result = this.resolveResult();
      this.onFinished.emit(result);
    });

    this.logger.onLog.subscribe(this.onLog.emit);
    this.interpreter.start();
  }

  public readVariable(name: string): unknown | null {
    return this.variableManager.get(name);
  }

  public writeVariable(name: string, value: unknown) {
    this.variableManager.set(name, value);
  }

  public initializeSubExecution(process: Process, input: Record<string, unknown>): ProcessExecution {
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
}

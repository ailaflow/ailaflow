import { WorkflowMachineInterpreter } from 'sequential-workflow-machine';
import { ProcessLogger } from './services/process-logger';
import { WorkflowMachineGlobalState } from './workflow-machine-global-state';
import { SimpleEvent } from '@aibindkit/core';
import { ProcessVariableManager } from './services/process-variable-manager';
import { ProcessExecutionResult, ProcessLog } from '@aila/model';

export class ProcessExecution {
  public readonly onCurrentStepChanged = new SimpleEvent<string | null>();
  public readonly onFinished = new SimpleEvent<ProcessExecutionResult>();
  public readonly onLog = new SimpleEvent<ProcessLog>();

  public constructor(
    public readonly id: string,
    private readonly interpreter: WorkflowMachineInterpreter<WorkflowMachineGlobalState>,
    private readonly logger: ProcessLogger,
    private readonly variableManager: ProcessVariableManager
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

  public run(abortSignal: AbortSignal) {
    this.interpreter.onChange(() => {
      if (abortSignal.aborted) {
        this.interpreter.tryStop();
      } else {
        const snapshot = this.interpreter.getSnapshot();
        this.onCurrentStepChanged.emit(snapshot.tryGetCurrentStepId());
      }
    });

    this.interpreter.onDone(() => {
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
}

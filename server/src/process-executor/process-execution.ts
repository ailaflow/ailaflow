import { WorkflowMachineInterpreter } from 'sequential-workflow-machine';
import { WorkflowLog, WorkflowLogger } from './services/workflow-logger';
import { WorkflowMachineGlobalState } from './workflow-machine-global-state';
import { Ev } from '../core/ev';
import { WorkflowVariableManager } from './services/workflow-variable-manager';

export type ProcessExecutionVariableValues = Record<string, unknown>;

export type ProcessExecutionResult =
  | {
      error: string;
      stepId?: string | null;
      interruptedCode?: number;
    }
  | {
      output: ProcessExecutionVariableValues;
    };

export class ProcessExecution {
  public readonly onDone = new Ev<ProcessExecutionResult>();
  public readonly onLog = new Ev<WorkflowLog>();

  public constructor(
    private readonly interpreter: WorkflowMachineInterpreter<WorkflowMachineGlobalState>,
    private readonly workflowLogger: WorkflowLogger,
    private readonly variableManager: WorkflowVariableManager
  ) {}

  private resolveResult(): ProcessExecutionResult {
    const snapshot = this.interpreter.getSnapshot();
    if (snapshot.isFailed()) {
      if (snapshot.unhandledError) {
        return {
          error: snapshot.unhandledError.message,
          stepId: snapshot.unhandledError.stepId
        };
      }
      return {
        error: 'Unknown unhandled error'
      };
    }
    if (snapshot.isInterrupted()) {
      if (snapshot.globalState.interruptedError) {
        return {
          error: snapshot.globalState.interruptedError.message,
          interruptedCode: snapshot.globalState.interruptedError.code
        };
      }
      return {
        error: 'Unknown interrupted error'
      };
    }
    if (snapshot.isFinished()) {
      return {
        output: this.variableManager.dump()
      };
    }
    return {
      error: 'Maximum allowed time exceeded'
    };
  }

  public run(abortSignal: AbortSignal) {
    this.interpreter.onChange(() => {
      if (abortSignal.aborted) {
        this.interpreter.tryStop();
      }
    });

    this.interpreter.onDone(() => {
      const result = this.resolveResult();
      this.onDone.emit(result);
    });

    this.workflowLogger.onLog.subscribe(this.onLog.emit);
    this.interpreter.start();
  }

  public readVariable(name: string): unknown | null {
    return this.variableManager.get(name);
  }

  public writeVariable(name: string, value: unknown) {
    this.variableManager.set(name, value);
  }
}

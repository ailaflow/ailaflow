import { WorkflowMachineInterpreter } from 'sequential-workflow-machine';
import { ProcessDefinition } from '@aila/model';
import { WorkflowLog, WorkflowLogger } from './services/workflow-logger';
import { WorkflowMachineGlobalState } from './workflow-machine-global-state';
import { Ev } from '../core/ev';

export type WorkflowMachineVariableValues = Record<string, unknown>;

export type WorkflowMachineResult =
  | {
      error: string;
      stepId?: string | null;
      interruptedCode?: number;
    }
  | {
      output: WorkflowMachineVariableValues;
    };

export class WorkflowMachine {
  public readonly onDone = new Ev<WorkflowMachineResult>();
  public readonly onLog = new Ev<WorkflowLog>();

  public constructor(
    private readonly definition: ProcessDefinition,
    private readonly interpreter: WorkflowMachineInterpreter<WorkflowMachineGlobalState>,
    private readonly workflowLogger: WorkflowLogger
  ) {}

  private resolveResult(): WorkflowMachineResult {
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
      const output: WorkflowMachineVariableValues = {};
      for (const variable of this.definition.properties.variables) {
        if (variable.output) {
          output[variable.name] = snapshot.globalState.$variables.get(variable.name);
        }
      }
      return {
        output: {}
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
}

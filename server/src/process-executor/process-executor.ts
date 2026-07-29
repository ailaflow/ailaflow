import { SerializedWorkflowMachineSnapshot, WorkflowMachineInterpreter, createWorkflowMachineBuilder } from 'sequential-workflow-machine';
import { Process } from '../repositories/process/process';
import { SandboxInstanceManager } from '../sandbox/sandbox-instance-manager';
import { ProcessExecution } from './process-execution';
import { activitySet } from './activities/activity-set';
import { randomBytes } from 'crypto';
import { ProcessExecutionStore } from './process-execution-store';
import { ProcessExecutionVariableValues } from '@aila/model';
import { TaskManager } from './services/task-manager';
import { Logger } from '../core/logger';
import { ProcessExecutionSnapshotTransformer } from './process-execution-snapshot-transformer';
import { ProcessExecutionGlobalState, SerializedProcessExecutionGlobalState } from './process-execution-global-state';
import { ProcessExecutionPersister } from './process-execution-persister';

export class ProcessExecutor {
  private readonly logger = new Logger(ProcessExecutor.name);
  private readonly builder = createWorkflowMachineBuilder(activitySet);

  public constructor(
    private readonly sandboxInstanceManager: SandboxInstanceManager,
    private readonly processExecutionStore: ProcessExecutionStore,
    private readonly taskManager: TaskManager,
    private readonly processExecutionPersister: ProcessExecutionPersister
  ) {}

  public initialize(process: Process, input: ProcessExecutionVariableValues): ProcessExecution {
    const executionId = randomBytes(24).toString('hex');

    const machine = this.builder.build(process.definition);
    const globalState = ProcessExecutionGlobalState.create(executionId, input, process, {
      sandboxInstanceManager: this.sandboxInstanceManager,
      taskManager: this.taskManager
    });

    const interpreter = machine.create({
      init: () => globalState
    });

    return this.createExecution(process, executionId, interpreter, globalState);
  }

  public restore(process: Process, snapshot: SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState>): ProcessExecution {
    const restoredSnapshot = ProcessExecutionSnapshotTransformer.deserialize(snapshot, process, {
      sandboxInstanceManager: this.sandboxInstanceManager,
      taskManager: this.taskManager
    });
    const machine = this.builder.build(process.definition);
    const interpreter = machine.deserializeSnapshot(restoredSnapshot);
    const globalState = restoredSnapshot.context.globalState;

    return this.createExecution(process, globalState.executionId, interpreter, globalState);
  }

  private createExecution(
    process: Process,
    executionId: string,
    interpreter: WorkflowMachineInterpreter<ProcessExecutionGlobalState>,
    globalState: ProcessExecutionGlobalState
  ): ProcessExecution {
    const execution = new ProcessExecution(
      executionId,
      process,
      interpreter,
      globalState.$logger,
      globalState.$variables,
      this.processExecutionPersister
    );
    this.processExecutionStore.set(executionId, execution);
    execution.onFinished.subscribe(result => {
      this.processExecutionStore.delete(executionId);
      if (!result.success) {
        this.logger.error(`Process execution ${executionId} failed: ${result.error}`);
      }
    });
    execution.onPaused.subscribe(() => {
      this.processExecutionStore.delete(executionId);
    });
    return execution;
  }
}

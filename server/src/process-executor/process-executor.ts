import { SerializedWorkflowMachineSnapshot, WorkflowMachineInterpreter, createWorkflowMachineBuilder } from 'sequential-workflow-machine';
import { Process } from '../repositories/process/process';
import { ProcessExecution } from './process-execution';
import { activitySet } from './activities/activity-set';
import { randomBytes } from 'crypto';
import { ProcessExecutionStore } from './process-execution-store';
import { ProcessExecutionVariableValues } from '@aila/model';
import { ProcessExecutionSnapshotTransformer } from './process-execution-snapshot-transformer';
import { ProcessExecutionGlobalState, SerializedProcessExecutionGlobalState } from './process-execution-global-state';
import { ProcessExecutionPersister } from './process-execution-persister';
import { ProcessExecutionServices } from './services/services';
import { ProcessExecutionContext } from './process-execution-context';

export class ProcessExecutor {
  private readonly builder = createWorkflowMachineBuilder(activitySet);

  public constructor(
    private readonly processExecutionStore: ProcessExecutionStore,
    private readonly processExecutionPersister: ProcessExecutionPersister,
    private readonly services: ProcessExecutionServices
  ) {}

  public initialize(context: ProcessExecutionContext, process: Process, input: ProcessExecutionVariableValues): ProcessExecution {
    const executionId = randomBytes(24).toString('hex');

    const machine = this.builder.build(process.definition);
    const globalState = ProcessExecutionGlobalState.create(executionId, context, input, process, this.services);

    const interpreter = machine.create({
      init: () => globalState
    });

    return this.createExecution(executionId, context, process, interpreter, globalState);
  }

  public restore(
    executionId: string,
    context: ProcessExecutionContext,
    process: Process,
    snapshot: SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState>
  ): ProcessExecution {
    const restoredSnapshot = ProcessExecutionSnapshotTransformer.deserialize(executionId, context, process, snapshot, this.services);
    const machine = this.builder.build(process.definition);
    const interpreter = machine.deserializeSnapshot(restoredSnapshot);
    const globalState = restoredSnapshot.context.globalState;
    return this.createExecution(executionId, context, process, interpreter, globalState);
  }

  private createExecution(
    executionId: string,
    context: ProcessExecutionContext,
    process: Process,
    interpreter: WorkflowMachineInterpreter<ProcessExecutionGlobalState>,
    globalState: ProcessExecutionGlobalState
  ): ProcessExecution {
    const execution = new ProcessExecution(
      executionId,
      context,
      process,
      interpreter,
      globalState.logger,
      globalState.variables,
      this.processExecutionPersister
    );
    this.processExecutionStore.set(executionId, execution);

    const deleteFromStore = () => {
      this.processExecutionStore.delete(executionId);
    };

    execution.onFinished.subscribe(deleteFromStore);
    execution.onPaused.subscribe(deleteFromStore);
    return execution;
  }
}

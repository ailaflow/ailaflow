import { SerializedWorkflowMachineSnapshot, WorkflowMachineInterpreter, createWorkflowMachineBuilder } from 'sequential-workflow-machine';
import { Process } from '../repositories/process/process';
import { ProcessExecution } from './process-execution';
import { activitySet } from './activities/activity-set';
import { ProcessExecutionStore } from './process-execution-store';
import { ProcessExecutionTraceRetention, ProcessExecutionVariableValues } from '@ailaflow/shared';
import { ProcessExecutionSnapshotTransformer } from './process-execution-snapshot-transformer';
import { ProcessExecutionGlobalState, SerializedProcessExecutionGlobalState } from './process-execution-global-state';
import { ProcessExecutionPersister } from './process-execution-persister';
import { ProcessExecutionServices } from './services/services';
import { ProcessExecutionContext } from './process-execution-context';
import { randomUUID } from 'crypto';
import { EventBus } from '../events/event-bus';
import { ProcessExecutionTracer } from './process-execution-tracer';

export class ProcessExecutor {
  private readonly builder = createWorkflowMachineBuilder(activitySet);

  public constructor(
    private readonly processExecutionStore: ProcessExecutionStore,
    private readonly processExecutionPersister: ProcessExecutionPersister,
    private readonly processExecutionTracer: ProcessExecutionTracer,
    private readonly services: ProcessExecutionServices,
    private readonly eventBus: EventBus
  ) {}

  public initialize(context: ProcessExecutionContext, process: Process, input: ProcessExecutionVariableValues): ProcessExecution {
    const executionId = randomUUID();

    const machine = this.builder.build(process.definition);

    const stopController = new AbortController();
    const globalState = ProcessExecutionGlobalState.create(stopController.signal, executionId, context, input, process, this.services);

    const interpreter = machine.create({
      init: () => globalState
    });

    return this.createExecution(stopController, executionId, context, false, process, interpreter, globalState);
  }

  public resume(
    executionId: string,
    context: ProcessExecutionContext,
    process: Process,
    snapshot: SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState>
  ): ProcessExecution {
    const stopController = new AbortController();
    const restoredSnapshot = ProcessExecutionSnapshotTransformer.deserialize(
      stopController.signal,
      executionId,
      context,
      process,
      snapshot,
      this.services
    );
    const machine = this.builder.build(process.definition);
    const interpreter = machine.deserializeSnapshot(restoredSnapshot);
    const globalState = restoredSnapshot.context.globalState;
    return this.createExecution(stopController, executionId, context, true, process, interpreter, globalState);
  }

  private createExecution(
    stopController: AbortController,
    executionId: string,
    context: ProcessExecutionContext,
    isResumed: boolean,
    process: Process,
    interpreter: WorkflowMachineInterpreter<ProcessExecutionGlobalState>,
    globalState: ProcessExecutionGlobalState
  ): ProcessExecution {
    const execution = new ProcessExecution(
      executionId,
      context,
      isResumed,
      stopController,
      process,
      interpreter,
      globalState.logger,
      globalState.variables,
      this.eventBus,
      this.processExecutionPersister,
      this
    );

    this.processExecutionStore.bind(execution);

    if (!context.isTest && process.traceRetention !== ProcessExecutionTraceRetention.DISABLED) {
      this.processExecutionTracer.bind(process, execution);
    }

    return execution;
  }
}

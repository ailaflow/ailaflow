import { SerializedWorkflowMachineSnapshot } from 'sequential-workflow-machine';
import { SerializedProcessExecutionGlobalState } from '../../process-executor/process-execution-global-state';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';

export class PersistedExecution {
  public static create(
    executionId: string,
    context: ProcessExecutionContext,
    processName: string,
    processHash: string,
    state: SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState>
  ): PersistedExecution {
    const now = Date.now();
    return new PersistedExecution(executionId, context, processName, processHash, state, now, now);
  }

  public constructor(
    public readonly executionId: string,
    public readonly context: ProcessExecutionContext,
    public readonly processName: string,
    public readonly processHash: string,
    public readonly state: SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState>,
    public readonly createdAt: number,
    public readonly updatedAt: number
  ) {}
}

import { SerializedWorkflowMachineSnapshot } from 'sequential-workflow-machine';
import { SerializedProcessExecutionGlobalState } from '../../process-executor/process-execution-global-state';
import { ProcessExecutionOrigin } from '../../process-executor/process-execution';

export class PersistedExecution {
  public static create(
    executionId: string,
    origin: ProcessExecutionOrigin,
    processName: string,
    processHash: string,
    state: SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState>
  ): PersistedExecution {
    const now = Date.now();
    return new PersistedExecution(executionId, origin, processName, processHash, state, now, now);
  }

  public constructor(
    public readonly executionId: string,
    public readonly origin: ProcessExecutionOrigin,
    public readonly processName: string,
    public readonly processHash: string,
    public readonly state: SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState>,
    public readonly createdAt: number,
    public readonly updatedAt: number
  ) {}
}

import { SerializedWorkflowMachineSnapshot } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState, SerializedProcessExecutionGlobalState } from './process-execution-global-state';
import { Process } from '../repositories/process/process';
import { ProcessExecutionServices } from './services/services';
import { ProcessExecutionContext } from './process-execution-context';

export class ProcessExecutionSnapshotTransformer {
  public static serialize(
    snapshot: SerializedWorkflowMachineSnapshot<ProcessExecutionGlobalState>
  ): SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState> {
    const output = {
      ...snapshot,
      context: {
        ...snapshot.context,
        globalState: snapshot.context.globalState.serialize()
      }
    } as unknown as SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState>;

    this.deleteHistory(output);
    return output;
  }

  public static deserialize(
    abortSignal: AbortSignal,
    executionId: string,
    context: ProcessExecutionContext,
    process: Process,
    snapshot: SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState>,
    services: ProcessExecutionServices
  ): SerializedWorkflowMachineSnapshot<ProcessExecutionGlobalState> {
    const output = {
      ...snapshot,
      context: {
        ...snapshot.context,
        globalState: ProcessExecutionGlobalState.deserialize(
          abortSignal,
          executionId,
          context,
          snapshot.context.globalState,
          process,
          services
        )
      }
    } as unknown as SerializedWorkflowMachineSnapshot<ProcessExecutionGlobalState>;

    this.deleteHistory(output);
    return output;
  }

  private static deleteHistory<TGlobalState>(snapshot: SerializedWorkflowMachineSnapshot<TGlobalState>): void {
    delete (snapshot as { history?: unknown }).history;
  }
}

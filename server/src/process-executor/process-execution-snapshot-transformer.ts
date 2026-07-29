import { SerializedWorkflowMachineSnapshot } from 'sequential-workflow-machine';
import {
  ProcessExecutionGlobalState,
  ProcessExecutionGlobalStateServices,
  SerializedProcessExecutionGlobalState
} from './process-execution-global-state';
import { Process } from '../repositories/process/process';

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
    snapshot: SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState>,
    process: Process,
    services: ProcessExecutionGlobalStateServices
  ): SerializedWorkflowMachineSnapshot<ProcessExecutionGlobalState> {
    const output = {
      ...snapshot,
      context: {
        ...snapshot.context,
        globalState: ProcessExecutionGlobalState.deserialize(snapshot.context.globalState, process, services)
      }
    } as unknown as SerializedWorkflowMachineSnapshot<ProcessExecutionGlobalState>;

    this.deleteHistory(output);
    return output;
  }

  private static deleteHistory<TGlobalState>(snapshot: SerializedWorkflowMachineSnapshot<TGlobalState>): void {
    delete (snapshot as { history?: unknown }).history;
  }
}

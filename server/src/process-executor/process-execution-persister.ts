import { Process } from '../repositories/process/process';
import { PersistedExecution } from '../repositories/persisted-execution/persisted-execution';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { SerializedWorkflowMachineSnapshot } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from './process-execution-global-state';
import { ProcessExecutionSnapshotTransformer } from './process-execution-snapshot-transformer';
import type { ProcessExecution } from './process-execution';

export class ProcessExecutionPersister {
  public constructor(private readonly persistedExecutionRepository: PersistedExecutionRepository) {}

  public async persist(
    process: Process,
    execution: ProcessExecution,
    serializedSnapshot: SerializedWorkflowMachineSnapshot<ProcessExecutionGlobalState>
  ): Promise<void> {
    const pe = PersistedExecution.create(
      execution.id,
      execution.context,
      process.name,
      process.hash,
      ProcessExecutionSnapshotTransformer.serialize(serializedSnapshot)
    );
    await this.persistedExecutionRepository.upsert(AbortSignal.timeout(5_000), pe);
  }
}

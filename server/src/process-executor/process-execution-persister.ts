import { Process } from '../repositories/process/process';
import { PersistedExecution } from '../repositories/persisted-execution/persisted-execution';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { SerializedWorkflowMachineSnapshot } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from './process-execution-global-state';
import { ProcessExecutionSnapshotTransformer } from './process-execution-snapshot-transformer';
import { ProcessExecutionOrigin } from './process-execution';

export class ProcessExecutionPersister {
  public constructor(private readonly persistedExecutionRepository: PersistedExecutionRepository) {}

  public async persist(
    process: Process,
    executionId: string,
    origin: ProcessExecutionOrigin,
    serializedSnapshot: SerializedWorkflowMachineSnapshot<ProcessExecutionGlobalState>
  ): Promise<void> {
    const execution = PersistedExecution.create(
      executionId,
      origin,
      process.name,
      process.hash,
      ProcessExecutionSnapshotTransformer.serialize(serializedSnapshot)
    );
    await this.persistedExecutionRepository.upsert(AbortSignal.timeout(5_000), execution);
  }
}

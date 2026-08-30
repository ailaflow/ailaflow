import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { TaskRepository } from '../repositories/task/task-repository';

export class TaskDeleter {
  public constructor(
    private readonly taskRepository: TaskRepository,
    private readonly persistedExecutionRepository: PersistedExecutionRepository
  ) {}

  public async delete(abortSignal: AbortSignal, id: string): Promise<boolean> {
    const task = await this.taskRepository.tryGet(abortSignal, id);
    if (!task) {
      return false;
    }

    await this.persistedExecutionRepository.delete(abortSignal, task.executionId);
    return this.taskRepository.delete(abortSignal, id);
  }
}

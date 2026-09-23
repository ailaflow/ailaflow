import { Transaction } from '../core/transaction';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { TaskRepository } from '../repositories/task/task-repository';

export class TaskDeleter {
  public constructor(
    private readonly taskRepository: TaskRepository,
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly persistedExecutionRepository: PersistedExecutionRepository
  ) {}

  public async delete(signal: AbortSignal, id: string): Promise<boolean> {
    const task = await this.taskRepository.tryGet(signal, id);
    if (!task) {
      return false;
    }

    const transaction = Transaction.begin();
    try {
      await this.assignedTaskRepository.deleteAll(signal, id, transaction);
      const success = await this.taskRepository.delete(signal, id, transaction);
      await this.persistedExecutionRepository.delete(signal, task.executionId, transaction);
      await transaction.commit();
      return success;
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
}

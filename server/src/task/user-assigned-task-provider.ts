import { AssignedTask } from '../repositories/task/assigned-task';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { Task } from '../repositories/task/task';
import { TaskRepository } from '../repositories/task/task-repository';

export interface UserAssignedTask {
  assignedTask: AssignedTask;
  task: Task;
}

export class UserAssignedTaskProvider {
  public constructor(
    private readonly taskRepository: TaskRepository,
    private readonly assignedTaskRepository: AssignedTaskRepository
  ) {}

  public async tryGet(abortSignal: AbortSignal, userName: string, taskId: string): Promise<UserAssignedTask | null> {
    const assignedTask = await this.assignedTaskRepository.tryGet(abortSignal, taskId, userName);
    if (!assignedTask) {
      return null;
    }

    const task = await this.taskRepository.tryGet(abortSignal, taskId);
    if (!task) {
      throw new Error('Task not found but assignment exists');
    }

    return {
      assignedTask,
      task
    };
  }
}

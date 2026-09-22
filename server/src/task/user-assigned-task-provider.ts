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

  public async tryGetCompletable(signal: AbortSignal, isTest: boolean, userName: string, taskId: string): Promise<UserAssignedTask | null> {
    const assignedTask = await this.assignedTaskRepository.tryGet(signal, taskId, userName);
    if (!assignedTask || assignedTask.completedAt !== null) {
      return null;
    }

    const task = await this.taskRepository.tryGet(signal, taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found but assignment exists`);
    }
    if (task.isTest !== isTest) {
      throw new Error(`Task ${taskId} test status test failed ${task.isTest} !== ${isTest}`);
    }
    if (task.finalizedAt !== null) {
      return null;
    }

    return {
      assignedTask,
      task
    };
  }
}

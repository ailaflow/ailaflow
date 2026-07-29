import { TaskStep, UserAccessExpressionParser } from '@aila/model';
import { AssignedTaskRepository } from '../../repositories/task/assigned-task-repository';
import { TaskRepository } from '../../repositories/task/task-repository';
import { UserAccessExpressionUserQuerier } from '../../queriers/user-access-expression/user-access-expression-user-querier';
import { AssignedTask } from '../../repositories/task/assigned-task';
import { Task } from '../../repositories/task/task';

export class TaskManager {
  public constructor(
    private readonly taskRepository: TaskRepository,
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier
  ) {}

  public async create(abortSignal: AbortSignal, executionId: string, step: TaskStep) {
    const expression = UserAccessExpressionParser.parse(step.properties.userExpression);
    const userNames = await this.userAccessExpressionUserQuerier.queryUserNames(abortSignal, expression);

    const task = Task.create(
      step.name,
      executionId,
      step.properties.inputVariableNames,
      step.properties.outputVariableNames,
      step.properties.form,
      null
    );

    const assignedTasks = new Array(userNames.length);
    for (let i = 0; i < userNames.length; i++) {
      assignedTasks[i] = AssignedTask.create(task.id, userNames[i]);
    }

    await this.taskRepository.insert(abortSignal, task);
    await this.assignedTaskRepository.upsertMultiple(abortSignal, assignedTasks);

    return assignedTasks;
  }
}

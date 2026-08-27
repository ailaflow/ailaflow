import { FormDefinition, JsonSchema, UserAccessExpressionParser } from '@aila/model';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { TaskRepository } from '../repositories/task/task-repository';
import { UserAccessExpressionUserQuerier } from '../queriers/user-access-expression/user-access-expression-user-querier';
import { AssignedTask } from '../repositories/task/assigned-task';
import { Task } from '../repositories/task/task';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';

export class TaskCreator {
  public constructor(
    private readonly taskRepository: TaskRepository,
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier,
    private readonly userChatSessionProvider: UserChatSessionProvider
  ) {}

  public async create(
    abortSignal: AbortSignal,
    executionId: string,
    isTest: boolean,
    title: string,
    userExpression: string,
    inputVariableNames: string[],
    outputVariableSchemas: Record<string, JsonSchema> | null,
    form: FormDefinition
  ) {
    const parsedExpression = UserAccessExpressionParser.parse(userExpression);
    const userNames = await this.userAccessExpressionUserQuerier.queryUserNames(abortSignal, parsedExpression);

    const task = Task.create(title, executionId, isTest, inputVariableNames, outputVariableSchemas, form, null);

    const channelName = this.userChatSessionProvider.getDefaultChannelName();

    const assignedTasks = new Array<AssignedTask>(userNames.length);
    for (let i = 0; i < userNames.length; i++) {
      assignedTasks[i] = AssignedTask.create(task.id, userNames[i], channelName);
    }

    await this.taskRepository.insert(abortSignal, task);
    await this.assignedTaskRepository.upsertMultiple(abortSignal, assignedTasks);

    for (const userName of userNames) {
      const session = await this.userChatSessionProvider.get(abortSignal, isTest, userName, channelName);
      if (session) {
        session.queueUserMessage(`>>>>>>>>\nYou have a new task assigned: "${title}"\n<<<<<<<<`, {
          internal: true,
          taskId: task.id
        });
      }
    }
  }
}

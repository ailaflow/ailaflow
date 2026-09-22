import { FormDefinition, JsonSchema, TaskFinalizationPolicy, TaskSubmissionMode, UserAccessExpressionParser } from '@ailaflow/shared';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { TaskRepository } from '../repositories/task/task-repository';
import { UserAccessExpressionUserQuerier } from '../queriers/user-access-expression/user-access-expression-user-querier';
import { AssignedTask } from '../repositories/task/assigned-task';
import { Task } from '../repositories/task/task';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { Transaction } from '../core/transaction';

export class TaskCreator {
  public constructor(
    private readonly taskRepository: TaskRepository,
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier,
    private readonly userChatSessionProvider: UserChatSessionProvider
  ) {}

  public async create(
    signal: AbortSignal,
    isTest: boolean,
    createdBy: string,
    executionId: string,
    title: string,
    userExpression: string,
    deadline: number | null,
    finalizationPolicy: TaskFinalizationPolicy,
    metadataVariableName: string | null,
    inputVariableNames: string[],
    outputVariableSchemas: Record<string, JsonSchema> | null,
    form: FormDefinition,
    submissionMode: TaskSubmissionMode
  ) {
    const parsedExpression = UserAccessExpressionParser.parse(userExpression);
    const userNames = await this.userAccessExpressionUserQuerier.queryUserNames(signal, parsedExpression);

    const task = Task.create(
      title,
      isTest,
      createdBy,
      executionId,
      inputVariableNames,
      outputVariableSchemas,
      form,
      deadline,
      finalizationPolicy,
      metadataVariableName,
      submissionMode
    );

    const channelName = this.userChatSessionProvider.getDefaultChannelName();

    const assignedTasks = new Array<AssignedTask>(userNames.length);
    for (let i = 0; i < userNames.length; i++) {
      assignedTasks[i] = AssignedTask.create(task.id, userNames[i], channelName);
    }

    const transaction = Transaction.begin();
    try {
      await this.taskRepository.insert(signal, task, transaction);
      await this.assignedTaskRepository.upsertMultiple(signal, assignedTasks, transaction);
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }

    let m = '>>>>>>>>\n';
    m += 'The user has a new task assigned!\n';
    m += `ID: ${task.id}\n`;
    m += `Title: ${title}\n`;
    m += '<<<<<<<<';

    for (const userName of userNames) {
      const session = await this.userChatSessionProvider.get(signal, isTest, userName, channelName);
      if (session) {
        session.queueUserMessage(m, {
          internal: true
        });
      }
    }
  }
}

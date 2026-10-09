import {
  DEFAULT_CHANNEL_NAME,
  FormDefinition,
  JsonSchema,
  TaskFinalizationPolicy,
  TaskSubmissionMode,
  UserAccessExpressionParser
} from '@ailaflow/shared';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { TaskRepository } from '../repositories/task/task-repository';
import { UserAccessExpressionUserQuerier } from '../queriers/user-access-expression/user-access-expression-user-querier';
import { AssignedTask } from '../repositories/task/assigned-task';
import { Task } from '../repositories/task/task';
import { Transaction } from '../core/transaction';
import { Notifier } from '../notification/notifier';

export class TaskCreator {
  public constructor(
    private readonly taskRepository: TaskRepository,
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier,
    private readonly notifier: Notifier
  ) {}

  public async create(
    signal: AbortSignal,
    isTest: boolean,
    createdBy: string,
    executionId: string,
    processName: string,
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

    const assignedTasks = new Array<AssignedTask>(userNames.length);
    for (let i = 0; i < userNames.length; i++) {
      assignedTasks[i] = AssignedTask.create(task.id, userNames[i], DEFAULT_CHANNEL_NAME);
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

    let message = 'The user has a new task assigned!\n';
    message += `Title: ${title}`;

    let chatDetails = `Task ID: ${task.id}\n`;
    chatDetails += `Submission mode: ${task.submissionMode}`;

    await this.notifier.notifyUsersMatchingAccessExpression(
      signal,
      processName,
      isTest,
      userExpression,
      DEFAULT_CHANNEL_NAME,
      message,
      chatDetails
    );
  }
}

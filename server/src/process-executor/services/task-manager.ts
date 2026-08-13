import { JsonSchema, TaskStep, UserAccessExpressionParser } from '@aila/model';
import { AssignedTaskRepository } from '../../repositories/task/assigned-task-repository';
import { TaskRepository } from '../../repositories/task/task-repository';
import { UserAccessExpressionUserQuerier } from '../../queriers/user-access-expression/user-access-expression-user-querier';
import { AssignedTask } from '../../repositories/task/assigned-task';
import { Task } from '../../repositories/task/task';
import { UserChatSessionProvider } from '../../chat-session/user-chat-session-provider';
import { ProcessVariableManager } from './process-variable-manager';
import { ProcessVariableEvaluator } from './process-value-evaluator';

export class TaskManager {
  public constructor(
    private readonly taskRepository: TaskRepository,
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier,
    private readonly userChatSessionProvider: UserChatSessionProvider
  ) {}

  public async create(
    abortSignal: AbortSignal,
    executionId: string,
    step: TaskStep,
    variableEvaluator: ProcessVariableEvaluator,
    variableManager: ProcessVariableManager
  ) {
    const expression = variableEvaluator.evaluateStringOrVariable(step.properties.userExpression);

    const parsedExpression = UserAccessExpressionParser.parse(expression);
    const userNames = await this.userAccessExpressionUserQuerier.queryUserNames(abortSignal, parsedExpression);

    const outputVariableSchemas: Record<string, JsonSchema> = {};
    for (const name of step.properties.outputVariableNames) {
      outputVariableSchemas[name] = variableManager.getSchema(name);
    }

    const task = Task.create(
      step.name,
      executionId,
      step.properties.inputVariableNames,
      step.properties.outputVariableNames.length > 0 ? outputVariableSchemas : null,
      step.properties.form,
      null
    );

    const assignedTasks = new Array<AssignedTask>(userNames.length);
    for (let i = 0; i < userNames.length; i++) {
      assignedTasks[i] = AssignedTask.create(task.id, userNames[i]);
    }

    await this.taskRepository.insert(abortSignal, task);
    await this.assignedTaskRepository.upsertMultiple(abortSignal, assignedTasks);

    for (const userName of userNames) {
      const session = await this.userChatSessionProvider.getDefault(abortSignal, userName);
      if (session) {
        session.queueUserMessage(`>>>>>>>>\nYou have a new task assigned: "${step.name}", title: "${task.title}"\n<<<<<<<<`, {
          internal: true,
          taskForm: {
            taskId: task.id
          }
        });
      }
    }
  }
}

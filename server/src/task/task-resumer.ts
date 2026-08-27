import { ProcessExecutionVariableValues } from '@aila/model';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { IncompleteAssignedTaskCountQuerier } from '../queriers/task/incomplete-assigned-task-count-querier';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { UserAssignedTaskProvider } from './user-assigned-task-provider';
import { Task } from '../repositories/task/task';
import { ProcessExecutionResumer } from '../process-executor/process-execution-resumer';
import { Logger } from '../core/logger';

export class TaskResumerError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export class TaskResumer {
  private readonly logger = new Logger(TaskResumer.name);

  public constructor(
    private readonly userAssignedTaskProvider: UserAssignedTaskProvider,
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly incompleteAssignedTaskCountQuerier: IncompleteAssignedTaskCountQuerier,
    private readonly processExecutionResumer: ProcessExecutionResumer
  ) {}

  /**
   * @throws {TaskResumerError} if the task cannot be resumed
   */
  public async resume(
    abortSignal: AbortSignal,
    isTest: boolean,
    userName: string,
    taskId: string,
    outputValues: ProcessExecutionVariableValues
  ): Promise<void> {
    const userAssignedTask = await this.userAssignedTaskProvider.tryGet(abortSignal, isTest, userName, taskId);
    if (!userAssignedTask) {
      throw new TaskResumerError('Task not found or not assigned to the user');
    }
    const { assignedTask, task } = userAssignedTask;

    const chatSession = await this.userChatSessionProvider.get(abortSignal, isTest, userName, assignedTask.channelName);
    if (!chatSession) {
      throw new Error('Chat session not found');
    }

    const completeError = assignedTask.tryComplete(outputValues, task);
    if (completeError) {
      throw new Error(completeError);
    }

    await this.assignedTaskRepository.upsert(abortSignal, assignedTask);

    const pointer = chatSession.findByMetadata('taskId', assignedTask.taskId);
    if (pointer) {
      await chatSession.setMetadata(pointer.id, pointer.completedMessageIndex, 'finished', true);
    }

    const count = await this.incompleteAssignedTaskCountQuerier.queryIncompleteAssignedTaskCount(abortSignal, task.id);
    if (count === 0) {
      await this.resumeProcess(abortSignal, task);
    }

    this.logger.log(`Resumed successfully task ${task.id}`);
  }

  private async resumeProcess(abortSignal: AbortSignal, task: Task) {
    const completedAssignedTasks = await this.assignedTaskRepository.getAllCompleted(abortSignal, task.id);
    const outputValues: Record<string, unknown[]> = {};

    if (task.outputVariableSchemas) {
      const outputVariableNames = Object.keys(task.outputVariableSchemas);
      for (const name of outputVariableNames) {
        outputValues[name] = [];
      }

      for (const assignedTask of completedAssignedTasks) {
        if (!assignedTask.outputValues) {
          throw new Error('Assigned task has no output values');
        }

        for (const name of outputVariableNames) {
          const items = assignedTask.outputValues[name];
          if (items === undefined) {
            throw new Error(`Assigned task is missing output variable: \$${name}`);
          }
          if (!Array.isArray(items)) {
            throw new Error(`Assigned task output variable is not an array: \$${name}`);
          }
          if (items.length !== 1) {
            throw new Error(`Assigned task output variable has more than one item: \$${name}`);
          }
          outputValues[name].push(items[0]);
        }
      }
    }

    await this.processExecutionResumer.resume(abortSignal, task.executionId, outputValues);
  }
}

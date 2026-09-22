import { ProcessExecutionVariableValues, TaskSubmissionMode } from '@ailaflow/shared';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { UserAssignedTaskProvider } from './user-assigned-task-provider';
import { Logger } from '../core/logger';
import { ChatSession } from '@aibindkit/llm';
import { TaskRepository } from '../repositories/task/task-repository';
import { TaskFinalizationWorker } from './task-finalization-worker';
import { Transaction } from '../core/transaction';

export class AssignedTaskCompleterError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export class AssignedTaskCompleter {
  private readonly logger = new Logger(AssignedTaskCompleter.name);

  public constructor(
    private readonly userAssignedTaskProvider: UserAssignedTaskProvider,
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly taskRepository: TaskRepository,
    private readonly finalizationWorker: TaskFinalizationWorker
  ) {}

  /**
   * @throws {AssignedTaskCompleterError} if the assigned task cannot be completed
   */
  public async complete(
    signal: AbortSignal,
    isTest: boolean,
    userName: string,
    taskId: string,
    outputValues: ProcessExecutionVariableValues,
    isAiTool: boolean
  ): Promise<void> {
    const userAssignedTask = await this.userAssignedTaskProvider.tryGetCompletable(signal, isTest, userName, taskId);
    if (!userAssignedTask) {
      throw new AssignedTaskCompleterError('Task not found or not assigned to the user');
    }
    const { assignedTask, task } = userAssignedTask;
    if (isAiTool && task.submissionMode !== TaskSubmissionMode.AI_TOOL_OR_TASK_FORM) {
      throw new AssignedTaskCompleterError('This task cannot be submitted using an AI tool. Use its task form instead.');
    }

    const chatSession = await this.userChatSessionProvider.get(signal, isTest, userName, assignedTask.channelName);
    if (!chatSession) {
      throw new Error('Chat session not found');
    }

    const completeError = assignedTask.tryComplete(outputValues, task);
    if (completeError) {
      throw new AssignedTaskCompleterError(`Cannot complete assigned task: ${completeError}`);
    }

    const transaction = Transaction.begin();
    try {
      await this.assignedTaskRepository.upsert(signal, assignedTask, transaction);
      await this.taskRepository.incrementFinalizationRequestCount(signal, assignedTask.taskId, 1, transaction);
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }

    void this.updateChatSessionOnBackground(chatSession, assignedTask.taskId);

    this.finalizationWorker.trigger();
  }

  private async updateChatSessionOnBackground(chatSession: ChatSession, taskId: string) {
    try {
      const pointer = chatSession.findByMetadata('taskId', taskId);
      if (pointer) {
        const signal = AbortSignal.timeout(3_000);
        await chatSession.setMetadata(signal, pointer, 'finished', true);
      }
    } catch (e) {
      this.logger.warn(`Failed to update chat session metadata: ${(e as Error)?.message ?? e}`);
    }
  }
}

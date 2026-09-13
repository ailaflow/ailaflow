import { ProcessExecutionVariableValues } from '@ailaflow/shared';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { UserAssignedTaskProvider } from './user-assigned-task-provider';
import { TaskFinalizer } from './task-finalizer';
import { Logger } from '../core/logger';
import { ChatSession } from '@aibindkit/llm';

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
    private readonly taskFinalizer: TaskFinalizer
  ) {}

  /**
   * @throws {AssignedTaskCompleterError} if the assigned task cannot be completed
   */
  public async complete(
    abortSignal: AbortSignal,
    isTest: boolean,
    userName: string,
    taskId: string,
    outputValues: ProcessExecutionVariableValues
  ): Promise<void> {
    const userAssignedTask = await this.userAssignedTaskProvider.tryGetCompletable(abortSignal, isTest, userName, taskId);
    if (!userAssignedTask) {
      throw new AssignedTaskCompleterError('Task not found or not assigned to the user');
    }
    const { assignedTask, task } = userAssignedTask;

    const chatSession = await this.userChatSessionProvider.get(abortSignal, isTest, userName, assignedTask.channelName);
    if (!chatSession) {
      throw new Error('Chat session not found');
    }

    const completeError = assignedTask.tryComplete(outputValues, task);
    if (completeError) {
      throw new AssignedTaskCompleterError(`Cannot complete assigned task: ${completeError}`);
    }

    await this.assignedTaskRepository.upsert(abortSignal, assignedTask);
    void this.updateChatSessionOnBackground(chatSession, assignedTask.taskId);
    void this.tryFinalizeOnBackground(assignedTask.taskId);
  }

  private async updateChatSessionOnBackground(chatSession: ChatSession, taskId: string) {
    try {
      const pointer = chatSession.findByMetadata('taskId', taskId);
      if (pointer) {
        await chatSession.setMetadata(pointer.id, pointer.completedMessageIndex, 'finished', true);
      }
    } catch (e) {
      this.logger.warn(`Failed to update chat session metadata: ${(e as Error)?.message ?? e}`);
    }
  }

  private async tryFinalizeOnBackground(taskId: string) {
    const abortSignal = AbortSignal.timeout(10_000);
    try {
      await this.taskFinalizer.tryFinalize(abortSignal, taskId, null);
    } catch (e) {
      this.logger.warn(`Failed to finalize task: ${(e as Error)?.message ?? e}`);
    }
  }
}

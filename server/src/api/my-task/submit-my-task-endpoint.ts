import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';
import { submitMyTaskRequestSchema, SubmitMyTaskResponse } from '@aila/model';
import { ProcessExecutionResumer } from '../../process-executor/process-execution-resumer';
import { EndpointError } from '../framework/endpoint-error';
import { LiveChatSessionStore } from '@aibindkit/express';
import { AssignedTaskRepository } from '../../repositories/task/assigned-task-repository';
import { UserAssignedTaskProvider } from '../../providers/user-assigned-task-provider';
import { getAuthToken } from '../auth/auth-middleware';
import { IncompleteAssignedTaskCountQuerier } from '../../queriers/task/incomplete-assigned-task-count-querier';
import { Task } from '../../repositories/task/task';
import { Logger } from '../../core/logger';

export class SubmitMyTaskEndpoint implements Endpoint {
  private readonly logger = new Logger(SubmitMyTaskEndpoint.name);

  public readonly method = 'post';
  public readonly path = '/api/my-tasks/submit';
  public readonly auth = true;

  public constructor(
    private readonly resumer: ProcessExecutionResumer,
    private readonly userAssignedTaskProvider: UserAssignedTaskProvider,
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly liveSessionStore: LiveChatSessionStore,
    private readonly incompleteAssignedTaskCountQuerier: IncompleteAssignedTaskCountQuerier
  ) {}

  public async handle(req: Request): Promise<SubmitMyTaskResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const request = parseBody(submitMyTaskRequestSchema, req.body);

    const userAssignedTask = await this.userAssignedTaskProvider.tryGet(abortSignal, userName, request.taskId);
    if (!userAssignedTask) {
      throw new EndpointError('Task not found', 404);
    }
    const { assignedTask, task } = userAssignedTask;

    const chatSession = this.liveSessionStore.tryGetByToken(request.chatSession.token);
    if (!chatSession) {
      throw new EndpointError('Chat session not found', 404);
    }

    assignedTask.complete(request.outputValues);
    await this.assignedTaskRepository.upsert(abortSignal, assignedTask);

    chatSession.setMetadata(request.chatSession.messageId, request.chatSession.completedMessageIndex, 'finished', true);

    const count = await this.incompleteAssignedTaskCountQuerier.queryIncompleteAssignedTaskCount(abortSignal, task.id);
    if (count === 0) {
      await this.resume(abortSignal, task);
    }

    return {
      success: true
    };
  }

  private async resume(abortSignal: AbortSignal, task: Task) {
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

    this.logger.log(`Resuming process execution for task ${task.id}`);
    await this.resumer.resume(abortSignal, task.executionId, outputValues);
  }
}

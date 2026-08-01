import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-body';
import { submitMyTaskRequestSchema, SubmitMyTaskResponse } from '@aila/model';
import { ProcessExecutionResumer } from '../../process-executor/process-execution-resumer';
import { TaskRepository } from '../../repositories/task/task-repository';
import { EndpointError } from '../framework/endpoint-error';
import { LiveChatSessionStore } from '@aibindkit/express';
import { AssignedTaskRepository } from '../../repositories/task/assigned-task-repository';
import { getAuthToken } from '../auth/auth-middleware';

export class SubmitMyTaskEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-tasks/submit';
  public readonly auth = true;

  public constructor(
    private readonly resumer: ProcessExecutionResumer,
    private readonly taskRepository: TaskRepository,
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly liveSessionStore: LiveChatSessionStore
  ) {}

  public async handle(req: Request): Promise<SubmitMyTaskResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const request = parseBody(submitMyTaskRequestSchema, req.body);

    const assignedTask = await this.assignedTaskRepository.tryGet(abortSignal, request.taskId, userName);
    if (!assignedTask) {
      throw new EndpointError('Assigned task not found', 404);
    }

    const task = await this.taskRepository.tryGet(abortSignal, request.taskId);
    if (!task) {
      throw new Error('Task not found but assignment exists');
    }

    const chatSession = this.liveSessionStore.tryGetByToken(request.chatSession.token);
    if (!chatSession) {
      throw new EndpointError('Chat session not found', 404);
    }

    await this.resumer.resume(abortSignal, task.executionId, request.outputValues);

    assignedTask.complete();
    await this.assignedTaskRepository.upsert(abortSignal, assignedTask);

    chatSession.setMetadata(request.chatSession.messageId, request.chatSession.completedMessageIndex, 'finished', true);

    return {
      success: true
    };
  }
}

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

export class SubmitMyTaskEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-tasks/submit';
  public readonly auth = true;

  public constructor(
    private readonly resumer: ProcessExecutionResumer,
    private readonly userAssignedTaskProvider: UserAssignedTaskProvider,
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly liveSessionStore: LiveChatSessionStore
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

    await this.resumer.resume(abortSignal, task.executionId, request.outputValues);

    assignedTask.complete();
    await this.assignedTaskRepository.upsert(abortSignal, assignedTask);

    chatSession.setMetadata(request.chatSession.messageId, request.chatSession.completedMessageIndex, 'finished', true);

    return {
      success: true
    };
  }
}

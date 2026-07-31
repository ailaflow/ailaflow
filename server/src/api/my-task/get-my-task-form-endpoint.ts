import { GetMyTaskFormResponse } from '@aila/model';
import { Request } from 'express';
import { AssignedTaskRepository } from '../../repositories/task/assigned-task-repository';
import { TaskRepository } from '../../repositories/task/task-repository';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class GetMyTaskFormEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-tasks/:id/form';
  public readonly auth = true;

  public constructor(
    private readonly taskRepository: TaskRepository,
    private readonly assignedTaskRepository: AssignedTaskRepository
  ) {}

  public async handle(req: Request): Promise<GetMyTaskFormResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);
    const taskId = String(req.params.id);

    const assignedTask = await this.assignedTaskRepository.tryGet(abortSignal, taskId, authToken.userName);
    if (!assignedTask) {
      throw new EndpointError('Task not found', 404);
    }

    const task = await this.taskRepository.tryGet(abortSignal, taskId);
    if (!task) {
      throw new Error('Task not found but assignment exists');
    }

    return {
      form: task.form,
      inputVariableNames: task.inputVariableNames,
      outputVariableSchemas: task.outputVariableSchemas
    };
  }
}

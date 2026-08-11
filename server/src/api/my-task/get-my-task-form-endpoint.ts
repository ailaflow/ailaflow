import { GetMyTaskFormResponse } from '@aila/model';
import { Request } from 'express';
import { UserAssignedTaskProvider } from '../../task/user-assigned-task-provider';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class GetMyTaskFormEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-tasks/:id/form';
  public readonly auth = true;

  public constructor(private readonly userAssignedTaskProvider: UserAssignedTaskProvider) {}

  public async handle(req: Request): Promise<GetMyTaskFormResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);
    const taskId = String(req.params.id);

    const userAssignedTask = await this.userAssignedTaskProvider.tryGet(abortSignal, authToken.userName, taskId);
    if (!userAssignedTask) {
      throw new EndpointError('Task not found', 404);
    }
    const { task } = userAssignedTask;

    return {
      form: task.form,
      inputVariableNames: task.inputVariableNames,
      outputVariableSchemas: task.outputVariableSchemas
    };
  }
}

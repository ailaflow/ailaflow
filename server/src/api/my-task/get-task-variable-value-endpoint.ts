import { getTaskVariableValueRequestSchema, type GetTaskVariableValueResponse } from '@aila/model';
import { Endpoint } from '../framework/endpoint';
import { Request } from 'express';
import { PersistedExecutionRepository } from '../../repositories/persisted-execution/persisted-execution-repository';
import { UserAssignedTaskProvider } from '../../providers/user-assigned-task-provider';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-body';
import { getAuthToken } from '../auth/auth-middleware';

export class GetTaskVariableValueEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-tasks/variable-value';
  public readonly auth = true;

  public constructor(
    private readonly userAssignedTaskProvider: UserAssignedTaskProvider,
    private readonly persistedExecutionRepository: PersistedExecutionRepository
  ) {}

  public async handle(req: Request): Promise<GetTaskVariableValueResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const request = parseBody(getTaskVariableValueRequestSchema, req.body);

    const userAssignedTask = await this.userAssignedTaskProvider.tryGet(abortSignal, userName, request.taskId);
    if (!userAssignedTask) {
      throw new EndpointError('Task not found', 404);
    }
    const task = userAssignedTask.task;

    if (!task.canReadInputVariable(request.variableName)) {
      throw new EndpointError('The variable is not an input variable of the task', 400);
    }

    const pe = await this.persistedExecutionRepository.tryGet(abortSignal, task.executionId);
    if (!pe) {
      throw new Error('Cannot find the execution');
    }

    const values = pe.state.context.globalState.variableValues;
    const value = values[request.variableName];
    if (value === undefined) {
      throw new Error(`The variable \$${request.variableName} does not exist in the execution context`);
    }

    return {
      value
    };
  }
}

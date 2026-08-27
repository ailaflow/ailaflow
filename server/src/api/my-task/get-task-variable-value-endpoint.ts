import { getTaskVariableValueRequestSchema, type GetTaskVariableValueResponse } from '@aila/model';
import { Endpoint } from '../framework/endpoint';
import { Request } from 'express';
import { TaskInputVariableValuesProvider } from '../../task/task-input-variable-values-provider';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';
import { getAuthToken } from '../auth/auth-middleware';

export class GetTaskVariableValueEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-tasks/variable-value';
  public readonly auth = true;

  public constructor(private readonly taskInputVariableValuesProvider: TaskInputVariableValuesProvider) {}

  public async handle(req: Request): Promise<GetTaskVariableValueResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);
    const request = parseBody(getTaskVariableValueRequestSchema, req.body);

    const { isTest, userName } = authToken.maybeOverrideTestUserName(request.testUserName);

    const values = await this.taskInputVariableValuesProvider.tryGet(abortSignal, isTest, userName, request.taskId);
    if (!values) {
      throw new EndpointError('Task not found', 404);
    }

    const value = values.tryGetOne(request.variableName);
    if (value === undefined) {
      throw new EndpointError('The variable is not an input variable of the task', 400);
    }

    return {
      value
    };
  }
}

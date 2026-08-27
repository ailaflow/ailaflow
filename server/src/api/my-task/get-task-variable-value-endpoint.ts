import { getTaskVariableValueRequestSchema, type GetTaskVariableValueResponse } from '@aila/model';
import { Endpoint } from '../framework/endpoint';
import { Request } from 'express';
import { UserTaskDetailsProvider } from '../../task/user-task-details-provider';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';
import { getAuthToken } from '../auth/auth-middleware';

export class GetTaskVariableValueEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-tasks/variable-value';
  public readonly auth = true;

  public constructor(private readonly provider: UserTaskDetailsProvider) {}

  public async handle(req: Request): Promise<GetTaskVariableValueResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);
    const request = parseBody(getTaskVariableValueRequestSchema, req.body);

    const { isTest, userName } = authToken.maybeOverrideTestUserName(request.testUserName);

    const details = await this.provider.tryGet(abortSignal, isTest, userName, request.taskId);
    if (!details) {
      throw new EndpointError('Task not found', 404);
    }

    const value = details.tryGetInputVariableValue(request.variableName);
    if (value === undefined) {
      throw new EndpointError('The variable is not an input variable of the task', 400);
    }

    return {
      value
    };
  }
}

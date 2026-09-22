import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';
import { submitMyTaskRequestSchema, SubmitMyTaskResponse } from '@ailaflow/shared';
import { EndpointError } from '../framework/endpoint-error';
import { getAuthToken } from '../auth/auth-middleware';
import { AssignedTaskCompleter, AssignedTaskCompleterError } from '../../task/assigned-task-completer';

export class SubmitMyTaskEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-tasks/submit';
  public readonly auth = true;

  public constructor(private readonly assignedTaskCompleter: AssignedTaskCompleter) {}

  public async handle(req: Request): Promise<SubmitMyTaskResponse> {
    const signal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);
    const request = parseBody(submitMyTaskRequestSchema, req.body);

    const { isTest, userName } = authToken.maybeOverrideTestUserName(request.testUserName);

    try {
      await this.assignedTaskCompleter.complete(signal, isTest, userName, request.taskId, request.outputValues, false);
    } catch (e) {
      if (e instanceof AssignedTaskCompleterError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    return {
      success: true
    };
  }
}

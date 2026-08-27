import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';
import { submitMyTaskRequestSchema, SubmitMyTaskResponse } from '@aila/model';
import { EndpointError } from '../framework/endpoint-error';
import { getAuthToken } from '../auth/auth-middleware';
import { TaskResumer, TaskResumerError } from '../../task/task-resumer';

export class SubmitMyTaskEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-tasks/submit';
  public readonly auth = true;

  public constructor(private readonly taskResumer: TaskResumer) {}

  public async handle(req: Request): Promise<SubmitMyTaskResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);
    const request = parseBody(submitMyTaskRequestSchema, req.body);

    const { isTest, userName } = authToken.maybeOverrideTestUserName(request.testUserName);

    try {
      await this.taskResumer.resume(abortSignal, isTest, userName, request.taskId, request.outputValues);
    } catch (e) {
      if (e instanceof TaskResumerError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    return {
      success: true
    };
  }
}

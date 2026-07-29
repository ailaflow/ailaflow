import { GetMyTasksResponse } from '@aila/model';
import { Request } from 'express';
import { MyTaskListQuerier } from '../../queriers/my-task-list/my-task-list-querier';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetMyTasksEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-tasks';
  public readonly auth = true;

  public constructor(private readonly querier: MyTaskListQuerier) {}

  public async handle(req: Request): Promise<GetMyTasksResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);

    return {
      tasks: await this.querier.query(abortSignal, authToken.userName)
    };
  }
}

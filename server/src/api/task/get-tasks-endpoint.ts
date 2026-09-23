import { GetTasksResponse, getTasksRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { TaskListQuerier } from '../../queriers/task-list/task-list-querier';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseQuery } from '../framework/parse-request';

export class GetTasksEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/tasks';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: TaskListQuerier) {}

  public async handle(req: Request): Promise<GetTasksResponse> {
    const signal = getEndpointAbortSignal(req);
    const { onlyOpen, page, pageSize } = parseQuery(getTasksRequestSchema, req.query);
    return this.querier.query(signal, onlyOpen, page, pageSize);
  }
}

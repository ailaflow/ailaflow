import { DeleteTaskResponse, GetTasksResponse, getTasksRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { TaskListQuerier } from '../../queriers/task-list/task-list-querier';
import { TaskDeleter } from '../../task/task-deleter';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseQuery } from '../framework/parse-request';

export class GetTasksEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/tasks';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: TaskListQuerier) {}

  public async handle(req: Request): Promise<GetTasksResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { onlyOpen, page, pageSize } = parseQuery(getTasksRequestSchema, req.query);
    return this.querier.query(abortSignal, onlyOpen, page, pageSize);
  }
}

export class DeleteTaskEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/tasks/:id';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly taskDeleter: TaskDeleter) {}

  public async handle(req: Request): Promise<DeleteTaskResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const id = String(req.params.id);
    const deleted = await this.taskDeleter.delete(abortSignal, id);
    if (!deleted) {
      throw new EndpointError('Task not found', 404);
    }

    return { id };
  }
}

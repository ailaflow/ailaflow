import { DeleteTaskResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { TaskDeleter } from '../../task/task-deleter';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class DeleteTaskEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/tasks/:id';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly taskDeleter: TaskDeleter) {}

  public async handle(req: Request): Promise<DeleteTaskResponse> {
    const signal = getEndpointAbortSignal(req);
    const id = String(req.params.id);
    const deleted = await this.taskDeleter.delete(signal, id);
    if (!deleted) {
      throw new EndpointError('Task not found', 404);
    }

    return { id };
  }
}

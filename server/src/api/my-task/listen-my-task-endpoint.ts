import { ListenMyTasksUpdate } from '@ailaflow/shared';
import { Request, Response } from 'express';
import { SseResponse } from '../../core/sse-response';
import { TaskListenerStore, TaskListenerStoreListener } from '../../task/task-listener-store';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';

export class ListenMyTaskEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-tasks/listen';
  public readonly auth = true;

  public constructor(private readonly taskListenerStore: TaskListenerStore) {}

  public async handle(req: Request, res: Response): Promise<void> {
    const { userName } = getAuthToken(req);
    const sseResponse = new SseResponse<ListenMyTasksUpdate>(res);

    const listener: TaskListenerStoreListener = task => {
      sseResponse.send({
        task: {
          id: task.id,
          title: task.title,
          submissionMode: task.submissionMode,
          createdAt: task.createdAt,
          ...(task.deadline === null ? {} : { deadline: task.deadline })
        }
      });
    };

    this.taskListenerStore.set(userName, listener);
    sseResponse.onClose(() => this.taskListenerStore.delete(userName, listener));
  }
}

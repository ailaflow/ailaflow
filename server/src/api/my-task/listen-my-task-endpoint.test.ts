import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { TaskFinalizationPolicy, TaskSubmissionMode } from '@ailaflow/shared';
import { Request, Response } from 'express';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { Task } from '../../repositories/task/task';
import { TaskListenerStore } from '../../task/task-listener-store';
import { ListenMyTaskEndpoint } from './listen-my-task-endpoint';

test('streams tasks for the authenticated user and unsubscribes on close', async () => {
  const store = new TaskListenerStore();
  const endpoint = new ListenMyTaskEndpoint(store);
  const response = createResponse();

  await endpoint.handle(createRequest('alice'), response.value);

  assert.equal(store.listeners.get('alice')?.size, 1);

  store.notify('bob', createTask('other-task'));
  store.notify('alice', createTask('my-task'));

  assert.deepEqual(response.events, [
    {
      task: {
        id: 'my-task',
        title: 'Task',
        submissionMode: TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
        createdAt: 123,
        deadline: 456
      }
    }
  ]);

  response.value.emit('close');

  assert.equal(store.listeners.has('alice'), false);
});

function createTask(id: string): Task {
  return new Task(
    id,
    'Task',
    false,
    'creator',
    'execution',
    [],
    null,
    null,
    456,
    TaskFinalizationPolicy.ALL_ASSIGNEES,
    null,
    TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
    0,
    null,
    123,
    null,
    null
  );
}

function createRequest(userName: string): Request {
  return Object.assign(new EventEmitter(), {
    authToken: new AuthToken('token', AuthToken.hashToken('token'), userName, Date.now() + 60_000, false)
  }) as unknown as Request;
}

function createResponse(): { value: Response & EventEmitter; events: unknown[] } {
  const events: unknown[] = [];
  const value = Object.assign(new EventEmitter(), {
    setHeader: () => undefined,
    flushHeaders: () => undefined,
    write: (chunk: string) => {
      if (chunk.startsWith('data: ')) {
        events.push(JSON.parse(chunk.slice('data: '.length)));
      }
      return true;
    }
  }) as unknown as Response & EventEmitter;

  return { value, events };
}

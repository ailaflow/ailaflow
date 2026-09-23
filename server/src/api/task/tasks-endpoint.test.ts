import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { Request } from 'express';
import { TaskListQuerier } from '../../queriers/task-list/task-list-querier';
import { PersistedExecutionRepository } from '../../repositories/persisted-execution/persisted-execution-repository';
import { TaskRepository } from '../../repositories/task/task-repository';
import { TaskDeleter } from '../../task/task-deleter';
import { EndpointError } from '../framework/endpoint-error';
import { DeleteTaskEndpoint, GetTasksEndpoint } from './tasks-endpoint';

test('gets an open page of tasks from query parameters', async () => {
  let query: { onlyOpen: boolean; page: number; pageSize: number } | null = null;
  const querier: TaskListQuerier = {
    query: async (_, onlyOpen, page, pageSize) => {
      query = { onlyOpen, page, pageSize };
      return { tasks: [], totalCount: 0, page, pageSize };
    }
  };
  const endpoint = new GetTasksEndpoint(querier);

  assert.deepEqual(await endpoint.handle(createRequest({ query: { onlyOpen: '1', page: '2', pageSize: '10' } })), {
    tasks: [],
    totalCount: 0,
    page: 2,
    pageSize: 10
  });
  assert.deepEqual(query, { onlyOpen: true, page: 2, pageSize: 10 });
});

test('returns not found when deleting a missing task', async () => {
  const taskRepository: TaskRepository = {
    setup: async () => undefined,
    tryGet: async () => null,
    insert: async () => undefined,
    finalize: async () => undefined,
    fail: async () => undefined,
    incrementFinalizationRequestCount: async () => undefined,
    setNextFinalizationAttemptAt: async () => undefined,
    delete: async () => false
  };
  const persistedExecutionRepository: PersistedExecutionRepository = {
    setup: async () => undefined,
    upsert: async () => undefined,
    tryGet: async () => null,
    delete: async () => undefined
  };
  const endpoint = new DeleteTaskEndpoint(new TaskDeleter(taskRepository, persistedExecutionRepository));

  await assert.rejects(
    () => endpoint.handle(createRequest({ params: { id: 'missing' } })),
    error => error instanceof EndpointError && error.status === 404 && error.message === 'Task not found'
  );
});

function createRequest(values: { query?: Record<string, string>; params?: Record<string, string> }): Request {
  return Object.assign(new EventEmitter(), { query: {}, params: {}, ...values }) as unknown as Request;
}

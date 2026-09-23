import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { Request } from 'express';
import { TaskListQuerier } from '../../queriers/task-list/task-list-querier';
import { GetTasksEndpoint } from './get-tasks-endpoint';

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

function createRequest(values: { query?: Record<string, string> }): Request {
  return Object.assign(new EventEmitter(), { query: {}, params: {}, ...values }) as unknown as Request;
}

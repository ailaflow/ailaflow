import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { Request } from 'express';
import { PersistedExecutionRepository } from '../../repositories/persisted-execution/persisted-execution-repository';
import { AssignedTaskRepository } from '../../repositories/task/assigned-task-repository';
import { TaskRepository } from '../../repositories/task/task-repository';
import { TaskDeleter } from '../../task/task-deleter';
import { EndpointError } from '../framework/endpoint-error';
import { DeleteTaskEndpoint } from './delete-task-endpoint';

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
  const assignedTaskRepository: AssignedTaskRepository = {
    setup: async () => undefined,
    tryGet: async () => null,
    upsert: async () => undefined,
    upsertMultiple: async () => undefined,
    getAllCompleted: async () => [],
    deleteAll: async () => undefined
  };
  const persistedExecutionRepository: PersistedExecutionRepository = {
    setup: async () => undefined,
    upsert: async () => undefined,
    tryGet: async () => null,
    delete: async () => undefined,
    countProcessHashes: async () => 0
  };
  const endpoint = new DeleteTaskEndpoint(new TaskDeleter(taskRepository, assignedTaskRepository, persistedExecutionRepository));

  await assert.rejects(
    () => endpoint.handle(createRequest({ params: { id: 'missing' } })),
    error => error instanceof EndpointError && error.status === 404 && error.message === 'Task not found'
  );
});

function createRequest(values: { params?: Record<string, string> }): Request {
  return Object.assign(new EventEmitter(), { query: {}, params: {}, ...values }) as unknown as Request;
}

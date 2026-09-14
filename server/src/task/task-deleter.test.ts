import assert from 'node:assert/strict';
import test from 'node:test';
import { TaskFinalizationPolicy } from '@ailaflow/shared';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { TaskRepository } from '../repositories/task/task-repository';
import { Task } from '../repositories/task/task';
import { TaskDeleter } from './task-deleter';

test('deletes the persisted execution and task', async () => {
  const calls: string[] = [];
  const task = new Task(
    'task_1',
    'Task',
    false,
    'creator',
    'execution_1',
    [],
    null,
    null,
    null,
    TaskFinalizationPolicy.ALL_ASSIGNEES,
    null,
    0,
    null,
    1000,
    null
  );
  const taskRepository = createTaskRepository(task, async id => {
    calls.push(`task:${id}`);
    return true;
  });
  const persistedExecutionRepository = createPersistedExecutionRepository(async executionId => {
    calls.push(`execution:${executionId}`);
  });
  const deleter = new TaskDeleter(taskRepository, persistedExecutionRepository);

  assert.equal(await deleter.delete(new AbortController().signal, 'task_1'), true);
  assert.deepEqual(calls, ['execution:execution_1', 'task:task_1']);
});

test('does not delete anything when the task does not exist', async () => {
  let deleteCalled = false;
  const taskRepository = createTaskRepository(null, async () => {
    deleteCalled = true;
    return false;
  });
  const persistedExecutionRepository = createPersistedExecutionRepository(async () => {
    deleteCalled = true;
  });
  const deleter = new TaskDeleter(taskRepository, persistedExecutionRepository);

  assert.equal(await deleter.delete(new AbortController().signal, 'missing'), false);
  assert.equal(deleteCalled, false);
});

function createTaskRepository(task: Task | null, deleteTask: (id: string) => Promise<boolean>): TaskRepository {
  return {
    setup: async () => undefined,
    tryGet: async () => task,
    insert: async () => undefined,
    finalize: async () => undefined,
    incrementFinalizationRequestCount: async () => undefined,
    setNextFinalizationAttemptAt: async () => undefined,
    delete: async (_, id) => deleteTask(id)
  };
}

function createPersistedExecutionRepository(deleteExecution: (executionId: string) => Promise<void>): PersistedExecutionRepository {
  return {
    setup: async () => undefined,
    upsert: async () => undefined,
    tryGet: async () => null,
    delete: async (_, executionId) => deleteExecution(executionId)
  };
}

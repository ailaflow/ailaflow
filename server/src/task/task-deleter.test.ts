import assert from 'node:assert/strict';
import test from 'node:test';
import { TaskFinalizationPolicy, TaskSubmissionMode } from '@ailaflow/shared';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { TaskRepository } from '../repositories/task/task-repository';
import { Task } from '../repositories/task/task';
import { TaskDeleter } from './task-deleter';

test('deletes the persisted execution, assigned tasks, and task', async () => {
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
    TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
    0,
    null,
    1000,
    null,
    null
  );
  const taskRepository = createTaskRepository(task, async id => {
    calls.push(`task:${id}`);
    return true;
  });
  const persistedExecutionRepository = createPersistedExecutionRepository(async executionId => {
    calls.push(`execution:${executionId}`);
  });
  const assignedTaskRepository = createAssignedTaskRepository(async taskId => {
    calls.push(`assignedTasks:${taskId}`);
  });
  const deleter = new TaskDeleter(taskRepository, assignedTaskRepository, persistedExecutionRepository);

  assert.equal(await deleter.delete(new AbortController().signal, 'task_1'), true);
  assert.deepEqual(calls, ['execution:execution_1', 'assignedTasks:task_1', 'task:task_1']);
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
  const assignedTaskRepository = createAssignedTaskRepository(async () => {
    deleteCalled = true;
  });
  const deleter = new TaskDeleter(taskRepository, assignedTaskRepository, persistedExecutionRepository);

  assert.equal(await deleter.delete(new AbortController().signal, 'missing'), false);
  assert.equal(deleteCalled, false);
});

function createTaskRepository(task: Task | null, deleteTask: (id: string) => Promise<boolean>): TaskRepository {
  return {
    setup: async () => undefined,
    tryGet: async () => task,
    insert: async () => undefined,
    finalize: async () => undefined,
    fail: async () => undefined,
    incrementFinalizationRequestCount: async () => undefined,
    setNextFinalizationAttemptAt: async () => undefined,
    delete: async (_, id) => deleteTask(id)
  };
}

function createAssignedTaskRepository(deleteAll: (taskId: string) => Promise<void>): AssignedTaskRepository {
  return {
    setup: async () => undefined,
    tryGet: async () => null,
    upsert: async () => undefined,
    upsertMultiple: async () => undefined,
    getAllCompleted: async () => [],
    deleteAll: async (_, taskId) => deleteAll(taskId)
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

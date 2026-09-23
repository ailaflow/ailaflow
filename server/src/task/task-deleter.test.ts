import assert from 'node:assert/strict';
import test from 'node:test';
import { TaskFinalizationPolicy, TaskSubmissionMode } from '@ailaflow/shared';
import { Transaction } from '../core/transaction';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { TaskRepository } from '../repositories/task/task-repository';
import { Task } from '../repositories/task/task';
import { TaskDeleter } from './task-deleter';

test('deletes the persisted execution, assigned tasks, and task', async () => {
  const calls: string[] = [];
  const transactions = new Set<Transaction | undefined>();
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
  const taskRepository = createTaskRepository(task, async (id, transaction) => {
    calls.push(`task:${id}`);
    transactions.add(transaction);
    return true;
  });
  const persistedExecutionRepository = createPersistedExecutionRepository(async (executionId, transaction) => {
    calls.push(`execution:${executionId}`);
    transactions.add(transaction);
  });
  const assignedTaskRepository = createAssignedTaskRepository(async (taskId, transaction) => {
    calls.push(`assignedTasks:${taskId}`);
    transactions.add(transaction);
  });
  const deleter = new TaskDeleter(taskRepository, assignedTaskRepository, persistedExecutionRepository);

  assert.equal(await deleter.delete(new AbortController().signal, 'task_1'), true);
  assert.deepEqual(calls, ['assignedTasks:task_1', 'task:task_1', 'execution:execution_1']);
  assert.equal(transactions.size, 1);
  assert.notEqual([...transactions][0], undefined);
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

function createTaskRepository(task: Task | null, deleteTask: (id: string, transaction?: Transaction) => Promise<boolean>): TaskRepository {
  return {
    setup: async () => undefined,
    tryGet: async () => task,
    insert: async () => undefined,
    finalize: async () => undefined,
    fail: async () => undefined,
    incrementFinalizationRequestCount: async () => undefined,
    setNextFinalizationAttemptAt: async () => undefined,
    delete: async (_, id, transaction) => deleteTask(id, transaction)
  };
}

function createAssignedTaskRepository(deleteAll: (taskId: string, transaction?: Transaction) => Promise<void>): AssignedTaskRepository {
  return {
    setup: async () => undefined,
    tryGet: async () => null,
    upsert: async () => undefined,
    upsertMultiple: async () => undefined,
    getAllCompleted: async () => [],
    deleteAll: async (_, taskId, transaction) => deleteAll(taskId, transaction)
  };
}

function createPersistedExecutionRepository(
  deleteExecution: (executionId: string, transaction?: Transaction) => Promise<void>
): PersistedExecutionRepository {
  return {
    setup: async () => undefined,
    upsert: async () => undefined,
    tryGet: async () => null,
    delete: async (_, executionId, transaction) => deleteExecution(executionId, transaction)
  };
}

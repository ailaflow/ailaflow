import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { TaskFinalizationPolicy, TaskSubmissionMode } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Task } from './task';
import { SqliteTaskRepository } from './sqlite-task-repository';
import { AssignedTask } from './assigned-task';
import { SqliteAssignedTaskRepository } from './sqlite-assigned-task-repository';

test('assigned tasks can be upserted and queried by task and user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;

  const taskRepository = new SqliteTaskRepository(dbs);
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);
  await taskRepository.setup(signal);
  await assignedTaskRepository.setup(signal);

  const task1 = new Task(
    'task_1',
    'Review request',
    false,
    'user_1',
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
  const task2 = new Task(
    'task_2',
    'Approve request',
    false,
    'user_1',
    'execution_1',
    [],
    null,
    null,
    null,
    TaskFinalizationPolicy.ANY_ASSIGNEE,
    null,
    TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
    0,
    null,
    1001,
    null,
    null
  );
  await taskRepository.insert(signal, task1);
  await taskRepository.insert(signal, task2);

  await assert.rejects(() => assignedTaskRepository.upsert(signal, AssignedTask.create('missing', 'user_1', 'default')));
  await assignedTaskRepository.upsert(signal, AssignedTask.create(task1.id, 'user_1', 'default'));
  await assignedTaskRepository.upsertMultiple(signal, [
    AssignedTask.create(task1.id, 'user_2', 'telegram'),
    new AssignedTask(task2.id, 'user_1', 'default', 2000, { approved: true, comments: ['ready'] })
  ]);

  assert.deepEqual(
    await assignedTaskRepository.tryGet(signal, task1.id, 'user_1'),
    new AssignedTask(task1.id, 'user_1', 'default', null, null)
  );
  assert.deepEqual(
    await assignedTaskRepository.tryGet(signal, task1.id, 'user_2'),
    new AssignedTask(task1.id, 'user_2', 'telegram', null, null)
  );
  assert.deepEqual(
    await assignedTaskRepository.tryGet(signal, task2.id, 'user_1'),
    new AssignedTask(task2.id, 'user_1', 'default', 2000, { approved: true, comments: ['ready'] })
  );
  assert.equal(await assignedTaskRepository.tryGet(signal, 'missing', 'user_1'), null);
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(signal, task1.id), []);
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(signal, task2.id), [
    new AssignedTask(task2.id, 'user_1', 'default', 2000, { approved: true, comments: ['ready'] })
  ]);

  await assignedTaskRepository.upsert(signal, new AssignedTask(task1.id, 'user_1', 'admin', 3000, { decision: 'accepted' }));
  assert.deepEqual(
    await assignedTaskRepository.tryGet(signal, task1.id, 'user_1'),
    new AssignedTask(task1.id, 'user_1', 'admin', 3000, { decision: 'accepted' })
  );
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(signal, task1.id), [
    new AssignedTask(task1.id, 'user_1', 'admin', 3000, { decision: 'accepted' })
  ]);
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(signal, 'missing'), []);

  await assignedTaskRepository.upsertMultiple(signal, []);
  await assignedTaskRepository.deleteAll(signal, task1.id);
  assert.equal(await assignedTaskRepository.tryGet(signal, task1.id, 'user_1'), null);
  assert.equal(await assignedTaskRepository.tryGet(signal, task1.id, 'user_2'), null);
  assert.notEqual(await assignedTaskRepository.tryGet(signal, task2.id, 'user_1'), null);

  const indexes = db
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
          AND name = 'assigned_tasks_user_name_idx'
      `
    )
    .all()
    .map(row => ({ ...row }));
  assert.deepEqual(indexes, [{ name: 'assigned_tasks_user_name_idx' }]);

  db.close();
});

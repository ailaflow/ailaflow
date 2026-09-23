import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { TaskFinalizationPolicy, TaskSubmissionMode } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { User } from '../user/user';
import { SqliteUserRepository } from '../user/sqlite-user-repository';
import { Task } from './task';
import { SqliteTaskRepository } from './sqlite-task-repository';
import { AssignedTask } from './assigned-task';
import { SqliteAssignedTaskRepository } from './sqlite-assigned-task-repository';

test('assigned tasks can be upserted and queried by task and user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;

  const userRepository = new SqliteUserRepository(dbs);
  const taskRepository = new SqliteTaskRepository(dbs);
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);
  await userRepository.setup(signal);
  await taskRepository.setup(signal);
  await assignedTaskRepository.setup(signal);

  const user1 = new User('user_1', null, 'hash', true, false);
  const user2 = new User('user_2', null, 'hash', true, false);
  await userRepository.insert(signal, user1);
  await userRepository.insert(signal, user2);

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

  await assert.rejects(() => assignedTaskRepository.upsert(signal, AssignedTask.create('missing', user1.name, 'default')));
  await assignedTaskRepository.upsert(signal, AssignedTask.create(task1.id, user1.name, 'default'));
  await assignedTaskRepository.upsertMultiple(signal, [
    AssignedTask.create(task1.id, user2.name, 'telegram'),
    new AssignedTask(task2.id, user1.name, 'default', 2000, { approved: true, comments: ['ready'] })
  ]);

  assert.deepEqual(
    await assignedTaskRepository.tryGet(signal, task1.id, user1.name),
    new AssignedTask(task1.id, user1.name, 'default', null, null)
  );
  assert.deepEqual(
    await assignedTaskRepository.tryGet(signal, task1.id, user2.name),
    new AssignedTask(task1.id, user2.name, 'telegram', null, null)
  );
  assert.deepEqual(
    await assignedTaskRepository.tryGet(signal, task2.id, user1.name),
    new AssignedTask(task2.id, user1.name, 'default', 2000, { approved: true, comments: ['ready'] })
  );
  assert.equal(await assignedTaskRepository.tryGet(signal, 'missing', user1.name), null);
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(signal, task1.id), []);
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(signal, task2.id), [
    new AssignedTask(task2.id, user1.name, 'default', 2000, { approved: true, comments: ['ready'] })
  ]);

  await assignedTaskRepository.upsert(signal, new AssignedTask(task1.id, user1.name, 'admin', 3000, { decision: 'accepted' }));
  assert.deepEqual(
    await assignedTaskRepository.tryGet(signal, task1.id, user1.name),
    new AssignedTask(task1.id, user1.name, 'admin', 3000, { decision: 'accepted' })
  );
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(signal, task1.id), [
    new AssignedTask(task1.id, user1.name, 'admin', 3000, { decision: 'accepted' })
  ]);
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(signal, 'missing'), []);

  await assignedTaskRepository.upsertMultiple(signal, []);

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

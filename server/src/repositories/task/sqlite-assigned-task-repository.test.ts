import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { User } from '../user/user';
import { SqliteUserRepository } from '../user/sqlite-user-repository';
import { Task } from './task';
import { SqliteTaskRepository } from './sqlite-task-repository';
import { AssignedTask } from './assigned-task';
import { SqliteAssignedTaskRepository } from './sqlite-assigned-task-repository';

test('assigned tasks can be upserted and queried by task and user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;

  const userRepository = new SqliteUserRepository(dbs);
  const taskRepository = new SqliteTaskRepository(dbs);
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);
  await userRepository.setup(abortSignal);
  await taskRepository.setup(abortSignal);
  await assignedTaskRepository.setup(abortSignal);

  const user1 = new User('user_1', 'hash', false);
  const user2 = new User('user_2', 'hash', false);
  await userRepository.insert(abortSignal, user1);
  await userRepository.insert(abortSignal, user2);

  const task1 = new Task('task_1', 'Review request', 'execution_1', [], [], null, null, 1000);
  const task2 = new Task('task_2', 'Approve request', 'execution_1', [], [], null, null, 1001);
  await taskRepository.insert(abortSignal, task1);
  await taskRepository.insert(abortSignal, task2);

  await assignedTaskRepository.upsert(abortSignal, AssignedTask.create(task1.id, user1.name));
  await assignedTaskRepository.upsertMultiple(abortSignal, [
    AssignedTask.create(task1.id, user2.name),
    new AssignedTask(task2.id, user1.name, 2000)
  ]);

  assert.deepEqual(await assignedTaskRepository.tryGet(abortSignal, task1.id, user1.name), new AssignedTask(task1.id, user1.name, null));
  assert.deepEqual(await assignedTaskRepository.tryGet(abortSignal, task1.id, user2.name), new AssignedTask(task1.id, user2.name, null));
  assert.deepEqual(await assignedTaskRepository.tryGet(abortSignal, task2.id, user1.name), new AssignedTask(task2.id, user1.name, 2000));
  assert.equal(await assignedTaskRepository.tryGet(abortSignal, 'missing', user1.name), null);

  await assignedTaskRepository.upsert(abortSignal, new AssignedTask(task1.id, user1.name, 3000));
  assert.deepEqual(await assignedTaskRepository.tryGet(abortSignal, task1.id, user1.name), new AssignedTask(task1.id, user1.name, 3000));

  await assignedTaskRepository.upsertMultiple(abortSignal, []);

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

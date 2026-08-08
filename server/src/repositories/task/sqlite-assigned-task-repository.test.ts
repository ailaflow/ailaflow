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

  const task1 = new Task('task_1', 'Review request', 'execution_1', [], null, null, null, 1000);
  const task2 = new Task('task_2', 'Approve request', 'execution_1', [], null, null, null, 1001);
  await taskRepository.insert(abortSignal, task1);
  await taskRepository.insert(abortSignal, task2);

  await assignedTaskRepository.upsert(abortSignal, AssignedTask.create(task1.id, user1.name));
  await assignedTaskRepository.upsertMultiple(abortSignal, [
    AssignedTask.create(task1.id, user2.name),
    new AssignedTask(task2.id, user1.name, 2000, { approved: true, comments: ['ready'] })
  ]);

  assert.deepEqual(
    await assignedTaskRepository.tryGet(abortSignal, task1.id, user1.name),
    new AssignedTask(task1.id, user1.name, null, null)
  );
  assert.deepEqual(
    await assignedTaskRepository.tryGet(abortSignal, task1.id, user2.name),
    new AssignedTask(task1.id, user2.name, null, null)
  );
  assert.deepEqual(
    await assignedTaskRepository.tryGet(abortSignal, task2.id, user1.name),
    new AssignedTask(task2.id, user1.name, 2000, { approved: true, comments: ['ready'] })
  );
  assert.equal(await assignedTaskRepository.tryGet(abortSignal, 'missing', user1.name), null);
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(abortSignal, task1.id), []);
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(abortSignal, task2.id), [
    new AssignedTask(task2.id, user1.name, 2000, { approved: true, comments: ['ready'] })
  ]);

  await assignedTaskRepository.upsert(abortSignal, new AssignedTask(task1.id, user1.name, 3000, { decision: 'accepted' }));
  assert.deepEqual(
    await assignedTaskRepository.tryGet(abortSignal, task1.id, user1.name),
    new AssignedTask(task1.id, user1.name, 3000, { decision: 'accepted' })
  );
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(abortSignal, task1.id), [
    new AssignedTask(task1.id, user1.name, 3000, { decision: 'accepted' })
  ]);
  assert.deepEqual(await assignedTaskRepository.getAllCompleted(abortSignal, 'missing'), []);

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

test('setup adds the output values column to an existing assigned tasks table', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);

  db.exec(`
    CREATE TABLE assigned_tasks (
      taskId TEXT NOT NULL,
      userName TEXT NOT NULL,
      completedAt INTEGER,
      PRIMARY KEY (taskId, userName)
    ) STRICT
  `);
  db.prepare(`INSERT INTO assigned_tasks (taskId, userName, completedAt) VALUES (?, ?, ?)`).run('task_1', 'user_1', null);

  await assignedTaskRepository.setup(abortSignal);

  assert.deepEqual(await assignedTaskRepository.tryGet(abortSignal, 'task_1', 'user_1'), new AssignedTask('task_1', 'user_1', null, null));
  assert.equal(db.prepare(`SELECT type FROM pragma_table_info('assigned_tasks') WHERE name = 'outputValues'`).get()?.type, 'TEXT');

  db.close();
});

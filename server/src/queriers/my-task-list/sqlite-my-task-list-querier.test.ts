import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AssignedTask } from '../../repositories/task/assigned-task';
import { SqliteAssignedTaskRepository } from '../../repositories/task/sqlite-assigned-task-repository';
import { Task } from '../../repositories/task/task';
import { SqliteTaskRepository } from '../../repositories/task/sqlite-task-repository';
import { User } from '../../repositories/user/user';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { SqliteMyTaskListQuerier } from './sqlite-my-task-list-querier';

test('queries tasks assigned to the current user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(dbs);
  const taskRepository = new SqliteTaskRepository(dbs);
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);
  const querier = new SqliteMyTaskListQuerier(dbs, () => 5000);

  await userRepository.setup(abortSignal);
  await taskRepository.setup(abortSignal);
  await assignedTaskRepository.setup(abortSignal);

  await userRepository.insert(abortSignal, new User('alice', 'hash', false));
  await userRepository.insert(abortSignal, new User('bob', 'hash', false));

  await taskRepository.insert(abortSignal, new Task('task_1', 'Open outdated', 'execution_1', false, [], null, null, 4000, 1000));
  await taskRepository.insert(abortSignal, new Task('task_2', 'Open current', 'execution_1', false, [], null, null, 6000, 1001));
  await taskRepository.insert(abortSignal, new Task('task_3', 'Completed outdated', 'execution_1', false, [], null, null, 3000, 1002));
  await taskRepository.insert(abortSignal, new Task('task_4', 'Other user', 'execution_1', false, [], null, null, 3000, 1003));
  await taskRepository.insert(abortSignal, new Task('task_5', 'No deadline', 'execution_1', false, [], null, null, null, 1004));
  await taskRepository.insert(abortSignal, new Task('task_6', 'Test task', 'execution_2', true, [], null, null, null, 1005));

  await assignedTaskRepository.upsertMultiple(abortSignal, [
    AssignedTask.create('task_1', 'alice', 'default'),
    AssignedTask.create('task_2', 'alice', 'default'),
    new AssignedTask('task_3', 'alice', 'default', 4500, null),
    AssignedTask.create('task_4', 'bob', 'default'),
    AssignedTask.create('task_5', 'alice', 'default'),
    AssignedTask.create('task_6', 'alice', 'default')
  ]);

  assert.deepEqual(await querier.query(abortSignal, false, 'alice', false, 1, 2), {
    tasks: [
      {
        id: 'task_1',
        title: 'Open outdated',
        isOutdated: true
      },
      {
        id: 'task_2',
        title: 'Open current'
      }
    ],
    totalCount: 4,
    page: 1,
    pageSize: 2
  });
  assert.deepEqual(await querier.query(abortSignal, false, 'alice', false, 2, 2), {
    tasks: [
      {
        id: 'task_3',
        title: 'Completed outdated',
        completedAt: 4500
      },
      {
        id: 'task_5',
        title: 'No deadline'
      }
    ],
    totalCount: 4,
    page: 2,
    pageSize: 2
  });
  assert.deepEqual(await querier.query(abortSignal, false, 'alice', true, 1, 20), {
    tasks: [
      {
        id: 'task_1',
        title: 'Open outdated',
        isOutdated: true
      },
      {
        id: 'task_2',
        title: 'Open current'
      },
      {
        id: 'task_5',
        title: 'No deadline'
      }
    ],
    totalCount: 3,
    page: 1,
    pageSize: 20
  });
  assert.deepEqual(await querier.query(abortSignal, true, 'alice', false, 1, 20), {
    tasks: [
      {
        id: 'task_6',
        title: 'Test task'
      }
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20
  });

  db.close();
});

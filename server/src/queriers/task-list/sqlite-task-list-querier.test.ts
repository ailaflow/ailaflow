import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { TaskFinalizationPolicy } from '@ailaflow/shared';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AssignedTask } from '../../repositories/task/assigned-task';
import { SqliteAssignedTaskRepository } from '../../repositories/task/sqlite-assigned-task-repository';
import { SqliteTaskRepository } from '../../repositories/task/sqlite-task-repository';
import { Task } from '../../repositories/task/task';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { SqliteTaskListQuerier } from './sqlite-task-list-querier';

test('queries newest tasks with pagination and an open filter', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(dbs);
  const taskRepository = new SqliteTaskRepository(dbs);
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);
  const querier = new SqliteTaskListQuerier(dbs, () => 2500);

  await userRepository.setup(abortSignal);
  await taskRepository.setup(abortSignal);
  await assignedTaskRepository.setup(abortSignal);
  await userRepository.insert(abortSignal, new User('alice', 'hash', false));
  await userRepository.insert(abortSignal, new User('bob', 'hash', false));

  await insertTask(taskRepository, abortSignal, 'open', 1000, null, false);
  await insertTask(taskRepository, abortSignal, 'outdated', 2000, 2000, true);
  await insertTask(taskRepository, abortSignal, 'completed', 3000, null, false);
  await insertTask(taskRepository, abortSignal, 'unassigned', 4000, null, false);

  await assignedTaskRepository.upsert(abortSignal, AssignedTask.create('open', 'alice', 'default'));
  await assignedTaskRepository.upsert(abortSignal, AssignedTask.create('outdated', 'alice', 'default'));
  await assignedTaskRepository.upsertMultiple(abortSignal, [
    new AssignedTask('completed', 'alice', 'default', 3100, {}),
    new AssignedTask('completed', 'bob', 'default', 3200, {})
  ]);

  assert.deepEqual(await querier.query(abortSignal, true, 1, 2), {
    tasks: [
      {
        id: 'unassigned',
        title: 'unassigned title',
        createdBy: 'unassigned creator',
        executionId: 'unassigned execution',
        isTest: false,
        assignedCount: 0,
        completedCount: 0,
        createdAt: 4000
      },
      {
        id: 'outdated',
        title: 'outdated title',
        createdBy: 'outdated creator',
        executionId: 'outdated execution',
        isTest: true,
        isOutdated: true,
        assignedCount: 1,
        completedCount: 0,
        createdAt: 2000
      }
    ],
    totalCount: 3,
    page: 1,
    pageSize: 2
  });

  assert.deepEqual(await querier.query(abortSignal, false, 1, 2), {
    tasks: [
      {
        id: 'unassigned',
        title: 'unassigned title',
        createdBy: 'unassigned creator',
        executionId: 'unassigned execution',
        isTest: false,
        assignedCount: 0,
        completedCount: 0,
        createdAt: 4000
      },
      {
        id: 'completed',
        title: 'completed title',
        createdBy: 'completed creator',
        executionId: 'completed execution',
        isTest: false,
        completedAt: 3200,
        assignedCount: 2,
        completedCount: 2,
        createdAt: 3000
      }
    ],
    totalCount: 4,
    page: 1,
    pageSize: 2
  });

  db.close();
});

async function insertTask(
  repository: SqliteTaskRepository,
  abortSignal: AbortSignal,
  id: string,
  createdAt: number,
  deadline: number | null,
  isTest: boolean
): Promise<void> {
  await repository.insert(
    abortSignal,
    new Task(
      id,
      `${id} title`,
      isTest,
      `${id} creator`,
      `${id} execution`,
      [],
      null,
      null,
      deadline,
      TaskFinalizationPolicy.ALL_ASSIGNEES,
      null,
      createdAt,
      null
    )
  );
}

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { TaskFinalizationPolicy, TaskSubmissionMode } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
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
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(dbs);
  const taskRepository = new SqliteTaskRepository(dbs);
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);
  const querier = new SqliteTaskListQuerier(dbs);

  await userRepository.setup(signal);
  await taskRepository.setup(signal);
  await assignedTaskRepository.setup(signal);
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));
  await userRepository.insert(signal, new User('bob', null, 'hash', true, false));

  await insertTask(taskRepository, signal, 'open', 1000, null, false, null);
  await insertTask(taskRepository, signal, 'outdated', 2000, 2000, true, null);
  await insertTask(taskRepository, signal, 'completed', 3000, null, false, 3200);
  await insertTask(taskRepository, signal, 'failed', 2500, null, false, null, 2600);
  await insertTask(taskRepository, signal, 'unassigned', 4000, null, false, null);

  await assignedTaskRepository.upsert(signal, new AssignedTask('open', 'alice', 'default', 1100, {}));
  await assignedTaskRepository.upsert(signal, AssignedTask.create('outdated', 'alice', 'default'));
  await assignedTaskRepository.upsertMultiple(signal, [
    new AssignedTask('completed', 'alice', 'default', 3100, {}),
    AssignedTask.create('completed', 'bob', 'default')
  ]);

  assert.deepEqual(await querier.query(signal, true, 1, 2), {
    tasks: [
      {
        id: 'unassigned',
        title: 'unassigned title',
        createdBy: 'unassigned creator',
        executionId: 'unassigned execution',
        isTest: false,
        deadline: null,
        assignedCount: 0,
        completedCount: 0,
        createdAt: 4000,
        finalizedAt: null,
        failedAt: null
      },
      {
        id: 'outdated',
        title: 'outdated title',
        createdBy: 'outdated creator',
        executionId: 'outdated execution',
        isTest: true,
        deadline: 2000,
        assignedCount: 1,
        completedCount: 0,
        createdAt: 2000,
        finalizedAt: null,
        failedAt: null
      }
    ],
    totalCount: 3,
    page: 1,
    pageSize: 2
  });

  assert.deepEqual(await querier.query(signal, false, 1, 2), {
    tasks: [
      {
        id: 'unassigned',
        title: 'unassigned title',
        createdBy: 'unassigned creator',
        executionId: 'unassigned execution',
        isTest: false,
        deadline: null,
        assignedCount: 0,
        completedCount: 0,
        createdAt: 4000,
        finalizedAt: null,
        failedAt: null
      },
      {
        id: 'completed',
        title: 'completed title',
        createdBy: 'completed creator',
        executionId: 'completed execution',
        isTest: false,
        deadline: null,
        assignedCount: 2,
        completedCount: 1,
        createdAt: 3000,
        finalizedAt: 3200,
        failedAt: null
      }
    ],
    totalCount: 5,
    page: 1,
    pageSize: 2
  });

  assert.deepEqual(await querier.query(signal, false, 2, 2), {
    tasks: [
      {
        id: 'failed',
        title: 'failed title',
        createdBy: 'failed creator',
        executionId: 'failed execution',
        isTest: false,
        deadline: null,
        assignedCount: 0,
        completedCount: 0,
        createdAt: 2500,
        finalizedAt: null,
        failedAt: 2600
      },
      {
        id: 'outdated',
        title: 'outdated title',
        createdBy: 'outdated creator',
        executionId: 'outdated execution',
        isTest: true,
        deadline: 2000,
        assignedCount: 1,
        completedCount: 0,
        createdAt: 2000,
        finalizedAt: null,
        failedAt: null
      }
    ],
    totalCount: 5,
    page: 2,
    pageSize: 2
  });

  db.close();
});

async function insertTask(
  repository: SqliteTaskRepository,
  signal: AbortSignal,
  id: string,
  createdAt: number,
  deadline: number | null,
  isTest: boolean,
  finalizedAt: number | null,
  failedAt: number | null = null
): Promise<void> {
  await repository.insert(
    signal,
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
      TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
      0,
      null,
      createdAt,
      finalizedAt,
      failedAt
    )
  );
}

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { TaskFinalizationPolicy, TaskSubmissionMode } from '@ailaflow/shared';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { SqliteDatabase, SqliteDatabases } from '../core/sqlite-databases';
import { UserAccessExpressionUserQuerier } from '../queriers/user-access-expression/user-access-expression-user-querier';
import { SqliteAssignedTaskRepository } from '../repositories/task/sqlite-assigned-task-repository';
import { SqliteTaskRepository } from '../repositories/task/sqlite-task-repository';
import { SqliteUserRepository } from '../repositories/user/sqlite-user-repository';
import { TaskCreator } from './task-creator';

test('rolls back task creation when assignment creation fails', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const taskRepository = new SqliteTaskRepository(dbs);
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);
  const userRepository = new SqliteUserRepository(dbs);
  const userQuerier: UserAccessExpressionUserQuerier = {
    queryUserNames: async () => ['missing-user']
  };
  const chatSessionProvider = {
    getDefaultChannelName: () => 'default',
    get: async () => null
  } as unknown as UserChatSessionProvider;
  const creator = new TaskCreator(taskRepository, assignedTaskRepository, userQuerier, chatSessionProvider);

  await userRepository.setup(abortSignal);
  await taskRepository.setup(abortSignal);
  await assignedTaskRepository.setup(abortSignal);

  await assert.rejects(() =>
    creator.create(
      abortSignal,
      false,
      'creator',
      'execution',
      'Task',
      '@missing-user',
      null,
      TaskFinalizationPolicy.ALL_ASSIGNEES,
      null,
      [],
      null,
      { css: '', html: '', js: '', inputExamples: [] },
      TaskSubmissionMode.AI_TOOL_OR_TASK_FORM
    )
  );

  const { taskCount } = db.prepare(`SELECT COUNT(*) AS taskCount FROM tasks`).get() as { taskCount: number };
  assert.equal(taskCount, 0);

  db.close();
});

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { TaskFinalizationPolicy, TaskSubmissionMode } from '@ailaflow/shared';
import { SqliteDatabase } from '../core/sqlite-database';
import { SqliteDatabases } from '../core/sqlite-databases';
import { Notifier } from '../notification/notifier';
import { UserAccessExpressionUserQuerier } from '../queriers/user-access-expression/user-access-expression-user-querier';
import { SqliteAssignedTaskRepository } from '../repositories/task/sqlite-assigned-task-repository';
import { SqliteTaskRepository } from '../repositories/task/sqlite-task-repository';
import { TaskCreator } from './task-creator';

test('rolls back task creation when assignment creation fails', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const taskRepository = new SqliteTaskRepository(dbs);
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);
  const userQuerier: UserAccessExpressionUserQuerier = {
    queryUserNames: async () => ['missing-user']
  };
  const notifier = {
    getDefaultUserChannelName: () => 'default'
  } as unknown as Notifier;
  const creator = new TaskCreator(taskRepository, assignedTaskRepository, userQuerier, notifier);

  await taskRepository.setup(signal);
  await assignedTaskRepository.setup(signal);
  db.exec(`
    CREATE TRIGGER fail_assigned_task_insert
    BEFORE INSERT ON assigned_tasks
    BEGIN
      SELECT RAISE(ABORT, 'assignment insert failed');
    END
  `);

  await assert.rejects(() =>
    creator.create(
      signal,
      false,
      'creator',
      'execution',
      'process',
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

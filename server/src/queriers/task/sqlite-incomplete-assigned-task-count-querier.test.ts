import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteIncompleteAssignedTaskCountQuerier } from './sqlite-incomplete-assigned-task-count-querier';

test('counts incomplete assigned tasks for a task', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const querier = new SqliteIncompleteAssignedTaskCountQuerier(dbs);

  db.exec(`
    CREATE TABLE assigned_tasks (
      taskId TEXT NOT NULL,
      userName TEXT NOT NULL,
      completedAt INTEGER,
      PRIMARY KEY (taskId, userName)
    ) STRICT
  `);
  const insert = db.prepare(`
    INSERT INTO assigned_tasks (taskId, userName, completedAt)
    VALUES (?, ?, ?)
  `);
  insert.run('task_1', 'alice', null);
  insert.run('task_1', 'bob', null);
  insert.run('task_1', 'charlie', 1000);
  insert.run('task_2', 'alice', null);

  assert.equal(await querier.queryIncompleteAssignedTaskCount(abortSignal, 'task_1'), 2);
  assert.equal(await querier.queryIncompleteAssignedTaskCount(abortSignal, 'task_2'), 1);
  assert.equal(await querier.queryIncompleteAssignedTaskCount(abortSignal, 'task_3'), 0);

  db.close();
});

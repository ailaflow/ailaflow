import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteExecutionTaskCandidateQuerier } from './sqlite-execution-task-candidate-querier';

test('queries a limited number of active task candidates for an execution and user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const querier = new SqliteExecutionTaskCandidateQuerier(dbs);

  db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      executionId TEXT NOT NULL,
      isTest INTEGER NOT NULL,
      deadline INTEGER,
      createdAt INTEGER NOT NULL,
      finalizedAt INTEGER,
      failedAt INTEGER
    ) STRICT;

    CREATE TABLE assigned_tasks (
      taskId TEXT NOT NULL,
      userName TEXT NOT NULL,
      completedAt INTEGER,
      PRIMARY KEY (taskId, userName)
    ) STRICT;
  `);
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, executionId, isTest, deadline, createdAt, finalizedAt, failedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAssignment = db.prepare(`
    INSERT INTO assigned_tasks (taskId, userName, completedAt)
    VALUES (?, ?, ?)
  `);

  insertTask.run('no-deadline', 'execution', 0, null, 1, null, null);
  insertTask.run('at-deadline', 'execution', 0, 1000, 2, null, null);
  insertTask.run('after-deadline', 'execution', 0, 1001, 3, null, null);
  insertTask.run('over-limit', 'execution', 0, null, 4, null, null);
  insertTask.run('expired', 'execution', 0, 999, 5, null, null);
  insertTask.run('completed-assignment', 'execution', 0, null, 6, null, null);
  insertTask.run('finalized-task', 'execution', 0, null, 7, 900, null);
  insertTask.run('other-execution', 'other execution', 0, null, 8, null, null);
  insertTask.run('test-task', 'execution', 1, null, 9, null, null);
  insertTask.run('other-user', 'execution', 0, null, 10, null, null);
  insertTask.run('failed-task', 'execution', 0, null, 11, null, 950);

  insertAssignment.run('no-deadline', 'alice', null);
  insertAssignment.run('at-deadline', 'alice', null);
  insertAssignment.run('after-deadline', 'alice', null);
  insertAssignment.run('over-limit', 'alice', null);
  insertAssignment.run('expired', 'alice', null);
  insertAssignment.run('completed-assignment', 'alice', 900);
  insertAssignment.run('finalized-task', 'alice', null);
  insertAssignment.run('other-execution', 'alice', null);
  insertAssignment.run('test-task', 'alice', null);
  insertAssignment.run('other-user', 'bob', null);
  insertAssignment.run('failed-task', 'alice', null);

  const candidates = await querier.query(signal, 'execution', 'alice', false, 1000, 10);

  assert.deepEqual(candidates, ['no-deadline', 'at-deadline', 'after-deadline', 'over-limit']);

  const limitedCandidates = await querier.query(signal, 'execution', 'alice', false, 1000, 3);

  assert.deepEqual(limitedCandidates, ['no-deadline', 'at-deadline', 'after-deadline']);

  db.close();
});

test('queries test task candidates separately', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const querier = new SqliteExecutionTaskCandidateQuerier(dbs);

  db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      executionId TEXT NOT NULL,
      isTest INTEGER NOT NULL,
      deadline INTEGER,
      createdAt INTEGER NOT NULL,
      finalizedAt INTEGER,
      failedAt INTEGER
    ) STRICT;

    CREATE TABLE assigned_tasks (
      taskId TEXT NOT NULL,
      userName TEXT NOT NULL,
      completedAt INTEGER,
      PRIMARY KEY (taskId, userName)
    ) STRICT;

    INSERT INTO tasks (id, executionId, isTest, deadline, createdAt, finalizedAt, failedAt)
    VALUES ('test-task', 'execution', 1, NULL, 1, NULL, NULL);

    INSERT INTO assigned_tasks (taskId, userName, completedAt)
    VALUES ('test-task', 'alice', NULL);
  `);

  const candidates = await querier.query(signal, 'execution', 'alice', true, 1000, 10);

  assert.deepEqual(candidates, ['test-task']);

  db.close();
});

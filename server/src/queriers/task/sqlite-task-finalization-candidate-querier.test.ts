import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTaskFinalizationCandidateQuerier } from './sqlite-task-finalization-candidate-querier';

test('queries only task finalization candidates eligible for an attempt', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const querier = new SqliteTaskFinalizationCandidateQuerier(dbs);

  db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      deadline INTEGER,
      finalizationRequestCount INTEGER NOT NULL,
      nextFinalizationAttemptAt INTEGER,
      createdAt INTEGER NOT NULL,
      finalizedAt INTEGER
    ) STRICT
  `);
  const insert = db.prepare(`
    INSERT INTO tasks (id, deadline, finalizationRequestCount, nextFinalizationAttemptAt, createdAt, finalizedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insert.run('requested', null, 1, null, 1, null);
  insert.run('deadline', 999, 0, null, 2, null);
  insert.run('blocked-request', null, 1, 1001, 3, null);
  insert.run('blocked-deadline', 999, 0, 1001, 4, null);
  insert.run('block-expired', null, 1, 1000, 5, null);
  insert.run('not-requested', null, 0, null, 6, null);
  insert.run('finalized', null, 1, null, 7, 900);

  const candidates = await querier.query(abortSignal, 1000, 10);
  assert.deepEqual(
    candidates.map(candidate => ({ ...candidate })),
    [
      { id: 'requested', deadline: null, finalizationRequestCount: 1 },
      { id: 'deadline', deadline: 999, finalizationRequestCount: 0 },
      { id: 'block-expired', deadline: null, finalizationRequestCount: 1 }
    ]
  );

  db.close();
});

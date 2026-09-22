import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { PersistedExecution } from './persisted-execution';
import { SqlitePersistedExecutionRepository } from './persisted-execution-repository';

test('persisted execution repository upserts, gets, and deletes an execution', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqlitePersistedExecutionRepository(dbs);

  await repository.setup(signal);

  const execution = new PersistedExecution(
    'execution_1',
    { startedBy: 'user_1', chatSessionId: 'session_1', isTest: true },
    'process_1',
    'hash_1',
    {
      value: { MAIN: { STEP_task_1: 'WAIT_FOR_SIGNAL' } },
      context: {
        globalState: {
          variableValues: {
            answer: 123
          }
        },
        activityStates: {}
      }
    } as never,
    1000,
    2000
  );

  await repository.upsert(signal, execution);

  assert.deepEqual(await repository.tryGet(signal, 'execution_1'), execution);

  await repository.delete(signal, 'execution_1');

  assert.equal(await repository.tryGet(signal, 'execution_1'), null);

  db.close();
});

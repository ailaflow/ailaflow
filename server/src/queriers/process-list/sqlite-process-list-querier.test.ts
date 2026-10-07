import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { ProcessDisplay, ProcessExecutionMode } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ProcessCronJob } from '../../repositories/process-cron-job/process-cron-job';
import { SqliteProcessCronJobRepository } from '../../repositories/process-cron-job/sqlite-process-cron-job-repository';
import { SqliteProcessRepository } from '../../repositories/process/sqlite-process-repository';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { SqliteProcessListQuerier } from './sqlite-process-list-querier';

test('returns whether each process has enabled cron jobs', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const processRepository = new SqliteProcessRepository(dbs);
  const cronJobRepository = new SqliteProcessCronJobRepository(dbs);
  const userRepository = new SqliteUserRepository(dbs);

  await userRepository.setup(signal);
  await processRepository.setup(signal);
  await cronJobRepository.setup(signal);
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));
  insertProcess(db, 'alpha');
  insertProcess(db, 'bravo');
  insertProcess(db, 'charlie');
  await cronJobRepository.insert(signal, createCronJob('alpha-enabled', 'alpha', true));
  await cronJobRepository.insert(signal, createCronJob('alpha-disabled', 'alpha', false));
  await cronJobRepository.insert(signal, createCronJob('bravo-enabled-1', 'bravo', true));
  await cronJobRepository.insert(signal, createCronJob('bravo-enabled-2', 'bravo', true));
  await cronJobRepository.insert(signal, createCronJob('charlie-disabled', 'charlie', false));

  const result = await new SqliteProcessListQuerier(dbs).query(signal, 1, 10, ProcessDisplay.HIDDEN);

  assert.deepEqual(Object.fromEntries(result.processes.map(process => [process.name, process.hasEnabledCronJobs])), {
    alpha: true,
    bravo: true,
    charlie: false
  });
  db.close();
});

function createCronJob(id: string, processName: string, isEnabled: boolean): ProcessCronJob {
  return new ProcessCronJob(id, processName, 'alice', '*/15 * * * *', 'UTC', {}, isEnabled, 60, 1_000, null);
}

function insertProcess(db: DatabaseSync, name: string): void {
  db.prepare(
    `
    INSERT INTO processes (
      name, description, userAccessExpression, display, executionMode, nSteps, nReturnSteps, nTasksSteps,
      startVariableSchemas, definition, definitionSize, definitionHash
    ) VALUES (?, '', '', ?, ?, 0, 0, 0, '{}', '{}', 2, 'hash')
  `
  ).run(name, ProcessDisplay.LISTED, ProcessExecutionMode.AI_TOOL_OR_START_FORM);
}

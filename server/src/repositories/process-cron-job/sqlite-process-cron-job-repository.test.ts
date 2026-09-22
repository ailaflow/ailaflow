import { ProcessCronJobRunStatus } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteProcessRepository } from '../process/sqlite-process-repository';
import { SqliteResourceAccessRepository } from '../resource-access/sqlite-resource-access-repository';
import { SqliteUserRepository } from '../user/sqlite-user-repository';
import { User } from '../user/user';
import { ProcessCronJob } from './process-cron-job';
import { SqliteProcessCronJobRepository } from './sqlite-process-cron-job-repository';

test('persists, updates, lists and deletes process cron jobs', async () => {
  const { signal, db, repository } = await setup();
  const job = createJob('job_1', 'alpha', 1_000);
  job.lastRun = {
    executionId: 'execution_1',
    status: ProcessCronJobRunStatus.FAILED,
    startedAt: 800,
    finishedAt: 900,
    error: 'Failed'
  };

  await repository.insert(signal, job);
  assert.deepEqual(await repository.tryGet(signal, job.id), job);
  assert.deepEqual(await repository.getByProcessName(signal, 'alpha'), [job]);

  job.expression = '0 * * * *';
  job.inputValues = { x: 2 };
  job.isEnabled = false;
  job.nextExecutionAt = 2_000;
  await repository.updateConfiguration(signal, job);
  assert.deepEqual(await repository.tryGet(signal, job.id), job);

  const nextLastRun = {
    executionId: 'execution_2',
    status: ProcessCronJobRunStatus.RUNNING,
    startedAt: 1_000,
    finishedAt: null,
    error: null
  };
  job.lastRun = nextLastRun;
  await repository.updateConfiguration(signal, job);
  assert.equal((await repository.tryGet(signal, job.id))?.lastRun?.executionId, 'execution_1');
  assert.equal(await repository.updateLastRun(signal, job.id, nextLastRun), true);
  assert.deepEqual((await repository.tryGet(signal, job.id))?.lastRun, nextLastRun);
  assert.equal(await repository.updateLastRun(signal, 'missing', nextLastRun), false);

  assert.equal(await repository.delete(signal, job.id), true);
  assert.equal(await repository.delete(signal, job.id), false);
  assert.equal(await repository.tryGet(signal, job.id), null);
  db.close();
});

test('finds due jobs and advances them only once', async () => {
  const { signal, db, repository } = await setup();
  await repository.insert(signal, createJob('due', 'alpha', 1_000));
  await repository.insert(signal, createJob('future', 'alpha', 2_000));
  await repository.insert(signal, new ProcessCronJob('disabled', 'alpha', 'alice', '* * * * *', 'UTC', {}, false, 1_000, null));

  assert.deepEqual(
    (await repository.getDue(signal, 1_500, 10)).map(job => job.id),
    ['due']
  );
  assert.equal(await repository.tryAdvanceNextExecutionAt(signal, 'due', 1_000, 3_000), true);
  assert.equal(await repository.tryAdvanceNextExecutionAt(signal, 'due', 1_000, 4_000), false);
  assert.equal((await repository.tryGet(signal, 'due'))?.nextExecutionAt, 3_000);
  db.close();
});

test('deletes jobs when their process is deleted', async () => {
  const { signal, db, processRepository, repository } = await setup();
  await repository.insert(signal, createJob('job_1', 'alpha', 1_000));

  assert.equal(await processRepository.delete(signal, 'alpha'), true);
  assert.equal(await repository.tryGet(signal, 'job_1'), null);
  db.close();
});

test('requires the starter user to reference an existing user', async () => {
  const { signal, db, repository } = await setup();
  const job = createJob('job_1', 'alpha', 1_000);
  job.starterUserName = 'missing';

  await assert.rejects(repository.insert(signal, job), /FOREIGN KEY constraint failed/);
  db.close();
});

async function setup() {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const processRepository = new SqliteProcessRepository(dbs);
  const repository = new SqliteProcessCronJobRepository(dbs);
  const userRepository = new SqliteUserRepository(dbs);
  await userRepository.setup(signal);
  await processRepository.setup(signal);
  await new SqliteResourceAccessRepository(dbs).setup(signal);
  await repository.setup(signal);
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));
  insertProcess(db, 'alpha');
  return { signal, db, processRepository, repository };
}

function createJob(id: string, processName: string, nextExecutionAt: number): ProcessCronJob {
  return new ProcessCronJob(id, processName, 'alice', '*/15 * * * *', 'UTC', { x: 1 }, true, nextExecutionAt, null);
}

function insertProcess(db: DatabaseSync, name: string): void {
  db.prepare(
    `
    INSERT INTO processes (
      name, description, userAccessExpression, display, nSteps, startVariableSchemas, serializedDefinition, definitionHash
    ) VALUES (?, '', '', 1, 0, '{}', '{"sequence":[],"properties":{"startVariableNames":[],"variables":[]}}', 'hash')
  `
  ).run(name);
}

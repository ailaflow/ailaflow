import { ProcessCronJobRunStatus } from '@ailaflow/model';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteProcessRepository } from '../process/sqlite-process-repository';
import { SqliteResourceAccessRepository } from '../resource-access/sqlite-resource-access-repository';
import { ProcessCronJob } from './process-cron-job';
import { SqliteProcessCronJobRepository } from './sqlite-process-cron-job-repository';

test('persists, updates, lists and deletes process cron jobs', async () => {
  const { abortSignal, db, repository } = await setup();
  const job = createJob('job_1', 'alpha', 1_000);
  job.lastRun = {
    executionId: 'execution_1',
    status: ProcessCronJobRunStatus.FAILED,
    startedAt: 800,
    finishedAt: 900,
    error: 'Failed'
  };

  await repository.insert(abortSignal, job);
  assert.deepEqual(await repository.tryGet(abortSignal, job.id), job);
  assert.deepEqual(await repository.getByProcessName(abortSignal, 'alpha'), [job]);

  job.expression = '0 * * * *';
  job.inputValues = { x: 2 };
  job.isEnabled = false;
  job.nextExecutionAt = 2_000;
  await repository.updateConfiguration(abortSignal, job);
  assert.deepEqual(await repository.tryGet(abortSignal, job.id), job);

  const nextLastRun = {
    executionId: 'execution_2',
    status: ProcessCronJobRunStatus.RUNNING,
    startedAt: 1_000,
    finishedAt: null,
    error: null
  };
  job.lastRun = nextLastRun;
  await repository.updateConfiguration(abortSignal, job);
  assert.equal((await repository.tryGet(abortSignal, job.id))?.lastRun?.executionId, 'execution_1');
  assert.equal(await repository.updateLastRun(abortSignal, job.id, nextLastRun), true);
  assert.deepEqual((await repository.tryGet(abortSignal, job.id))?.lastRun, nextLastRun);
  assert.equal(await repository.updateLastRun(abortSignal, 'missing', nextLastRun), false);

  assert.equal(await repository.delete(abortSignal, job.id), true);
  assert.equal(await repository.delete(abortSignal, job.id), false);
  assert.equal(await repository.tryGet(abortSignal, job.id), null);
  db.close();
});

test('finds due jobs and advances them only once', async () => {
  const { abortSignal, db, repository } = await setup();
  await repository.insert(abortSignal, createJob('due', 'alpha', 1_000));
  await repository.insert(abortSignal, createJob('future', 'alpha', 2_000));
  await repository.insert(abortSignal, new ProcessCronJob('disabled', 'alpha', '* * * * *', 'UTC', {}, false, 1_000, null));

  assert.deepEqual(
    (await repository.getDue(abortSignal, 1_500, 10)).map(job => job.id),
    ['due']
  );
  assert.equal(await repository.tryAdvanceNextExecutionAt(abortSignal, 'due', 1_000, 3_000), true);
  assert.equal(await repository.tryAdvanceNextExecutionAt(abortSignal, 'due', 1_000, 4_000), false);
  assert.equal((await repository.tryGet(abortSignal, 'due'))?.nextExecutionAt, 3_000);
  db.close();
});

test('deletes jobs when their process is deleted', async () => {
  const { abortSignal, db, processRepository, repository } = await setup();
  await repository.insert(abortSignal, createJob('job_1', 'alpha', 1_000));

  assert.equal(await processRepository.delete(abortSignal, 'alpha'), true);
  assert.equal(await repository.tryGet(abortSignal, 'job_1'), null);
  db.close();
});

async function setup() {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const processRepository = new SqliteProcessRepository(dbs);
  const repository = new SqliteProcessCronJobRepository(dbs);
  await processRepository.setup(abortSignal);
  await new SqliteResourceAccessRepository(dbs).setup(abortSignal);
  await repository.setup(abortSignal);
  insertProcess(db, 'alpha');
  return { abortSignal, db, processRepository, repository };
}

function createJob(id: string, processName: string, nextExecutionAt: number): ProcessCronJob {
  return new ProcessCronJob(id, processName, '*/15 * * * *', 'UTC', { x: 1 }, true, nextExecutionAt, null);
}

function insertProcess(db: DatabaseSync, name: string): void {
  db.prepare(
    `
    INSERT INTO processes (
      name, description, userAccessExpression, nSteps, startVariableSchemas, serializedDefinition, definitionHash
    ) VALUES (?, '', '', 0, '{}', '{"sequence":[],"properties":{"startVariableNames":[],"variables":[]}}', 'hash')
  `
  ).run(name);
}

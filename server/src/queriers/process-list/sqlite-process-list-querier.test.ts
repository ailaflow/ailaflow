import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteProcessRepository } from '../../repositories/process/sqlite-process-repository';
import { SqliteProcessListQuerier } from './sqlite-process-list-querier';

test('queries a name-ordered page of processes', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const processRepository = new SqliteProcessRepository(dbs);
  const querier = new SqliteProcessListQuerier(dbs);

  await processRepository.setup(abortSignal);
  insertProcess(db, 'charlie', true);
  insertProcess(db, 'alpha', false);
  insertProcess(db, 'bravo', false);

  assert.deepEqual(await querier.query(abortSignal, 2, 2), {
    processes: [
      {
        name: 'charlie',
        description: 'charlie description',
        userAccessExpression: '',
        isPausable: true,
        startVariableSchemas: {}
      }
    ],
    totalCount: 3,
    page: 2,
    pageSize: 2
  });

  db.close();
});

test('filters process names before counting and paginating, with the same matching as user search', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteProcessRepository(dbs);
  const querier = new SqliteProcessListQuerier(dbs);

  try {
    await repository.setup(abortSignal);
    for (const name of ['review-charlie', 'other', 'review-alpha', 'review-bravo', 'Review-uppercase']) {
      insertProcess(db, name, false);
    }

    const firstPage = await querier.query(abortSignal, 1, 2, 'review');
    assert.deepEqual(
      firstPage.processes.map(process => process.name),
      ['review-alpha', 'review-bravo']
    );
    assert.equal(firstPage.totalCount, 3);

    const secondPage = await querier.query(abortSignal, 2, 2, 'review');
    assert.deepEqual(
      secondPage.processes.map(process => process.name),
      ['review-charlie']
    );
    assert.equal(secondPage.totalCount, 3);
    assert.equal(secondPage.page, 2);
    assert.equal(secondPage.pageSize, 2);

    const noMatches = await querier.query(abortSignal, 1, 2, 'missing');
    assert.deepEqual(noMatches.processes, []);
    assert.equal(noMatches.totalCount, 0);
    assert.equal((await querier.query(abortSignal, 1, 20, '')).totalCount, 5);
  } finally {
    db.close();
  }
});

test('treats SQL wildcards and quotes as literal process search text', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteProcessRepository(dbs);
  const querier = new SqliteProcessListQuerier(dbs);

  try {
    await repository.setup(abortSignal);
    for (const name of ['percent%process', 'under_score', "quote'process", 'ordinary']) {
      insertProcess(db, name, false);
    }
    for (const [search, expectedName] of [
      ['%', 'percent%process'],
      ['_', 'under_score'],
      ["'", "quote'process"]
    ]) {
      const result = await querier.query(abortSignal, 1, 20, search);
      assert.deepEqual(
        result.processes.map(process => process.name),
        [expectedName]
      );
      assert.equal(result.totalCount, 1);
    }
    assert.equal((await querier.query(abortSignal, 1, 20, "' OR 1=1 --")).totalCount, 0);
  } finally {
    db.close();
  }
});

function insertProcess(db: DatabaseSync, name: string, isPausable: boolean): void {
  db.prepare(
    `
    INSERT INTO processes (
      name,
      description,
      userAccessExpression,
      nSteps,
      isPausable,
      startVariableSchemas,
      serializedDefinition,
      definitionHash
    )
    VALUES (?, ?, '', 0, ?, '{}', '{}', 'hash')
  `
  ).run(name, `${name} description`, isPausable ? 1 : 0);
}

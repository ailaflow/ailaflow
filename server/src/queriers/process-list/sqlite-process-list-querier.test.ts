import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteProcessRepository } from '../../repositories/process/sqlite-process-repository';
import { SqliteProcessListQuerier } from './sqlite-process-list-querier';
import { ProcessDisplay, ProcessExecutionMode } from '@ailaflow/shared';

test('queries a name-ordered page of processes', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const processRepository = new SqliteProcessRepository(dbs);
  const querier = new SqliteProcessListQuerier(dbs);

  await processRepository.setup(signal);
  insertProcess(db, 'charlie', 3, ProcessDisplay.HIDDEN, ProcessExecutionMode.START_FORM, 2, 128, '<svg></svg>');
  insertProcess(db, 'alpha', 0, ProcessDisplay.FEATURED);
  insertProcess(db, 'bravo', 0, ProcessDisplay.LISTED);

  assert.deepEqual(await querier.query(signal, 2, 2, ProcessDisplay.HIDDEN), {
    processes: [
      {
        name: 'charlie',
        description: 'charlie description',
        userAccessExpression: '',
        display: ProcessDisplay.HIDDEN,
        executionMode: ProcessExecutionMode.START_FORM,
        icon: '<svg></svg>',
        nTasksSteps: 3,
        nReturnSteps: 2,
        definitionSize: 128
      }
    ],
    totalCount: 3,
    page: 2,
    pageSize: 2
  });
  assert.deepEqual(
    (await querier.query(signal, 1, 10, ProcessDisplay.LISTED)).processes.map(process => process.name),
    ['alpha', 'bravo']
  );

  db.close();
});

test('filters process names before counting and paginating, with the same matching as user search', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteProcessRepository(dbs);
  const querier = new SqliteProcessListQuerier(dbs);

  try {
    await repository.setup(signal);
    for (const name of ['review-charlie', 'other', 'review-alpha', 'review-bravo', 'Review-uppercase']) {
      insertProcess(db, name, 0, ProcessDisplay.LISTED);
    }

    const firstPage = await querier.query(signal, 1, 2, ProcessDisplay.HIDDEN, 'review');
    assert.deepEqual(
      firstPage.processes.map(process => process.name),
      ['review-alpha', 'review-bravo']
    );
    assert.equal(firstPage.totalCount, 3);

    const secondPage = await querier.query(signal, 2, 2, ProcessDisplay.HIDDEN, 'review');
    assert.deepEqual(
      secondPage.processes.map(process => process.name),
      ['review-charlie']
    );
    assert.equal(secondPage.totalCount, 3);
    assert.equal(secondPage.page, 2);
    assert.equal(secondPage.pageSize, 2);

    const noMatches = await querier.query(signal, 1, 2, ProcessDisplay.HIDDEN, 'missing');
    assert.deepEqual(noMatches.processes, []);
    assert.equal(noMatches.totalCount, 0);
    assert.equal((await querier.query(signal, 1, 20, ProcessDisplay.HIDDEN, '')).totalCount, 5);
  } finally {
    db.close();
  }
});

test('treats SQL wildcards and quotes as literal process search text', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteProcessRepository(dbs);
  const querier = new SqliteProcessListQuerier(dbs);

  try {
    await repository.setup(signal);
    for (const name of ['percent%process', 'under_score', "quote'process", 'ordinary']) {
      insertProcess(db, name, 0, ProcessDisplay.LISTED);
    }
    for (const [search, expectedName] of [
      ['%', 'percent%process'],
      ['_', 'under_score'],
      ["'", "quote'process"]
    ]) {
      const result = await querier.query(signal, 1, 20, ProcessDisplay.HIDDEN, search);
      assert.deepEqual(
        result.processes.map(process => process.name),
        [expectedName]
      );
      assert.equal(result.totalCount, 1);
    }
    assert.equal((await querier.query(signal, 1, 20, ProcessDisplay.HIDDEN, "' OR 1=1 --")).totalCount, 0);
  } finally {
    db.close();
  }
});

function insertProcess(
  db: DatabaseSync,
  name: string,
  nTasksSteps: number,
  display: ProcessDisplay,
  executionMode = ProcessExecutionMode.AI_TOOL_OR_START_FORM,
  nReturnSteps = 0,
  definitionSize = 0,
  icon: string | null = null
): void {
  db.prepare(
    `
    INSERT INTO processes (
      name,
      description,
      userAccessExpression,
      display,
      executionMode,
      icon,
      nSteps,
      nReturnSteps,
      nTasksSteps,
      startVariableSchemas,
      definition,
      definitionSize,
      definitionHash
    )
    VALUES (?, ?, '', ?, ?, ?, 0, ?, ?, '{}', '{}', ?, 'hash')
  `
  ).run(name, `${name} description`, display, executionMode, icon, nReturnSteps, nTasksSteps, definitionSize);
}

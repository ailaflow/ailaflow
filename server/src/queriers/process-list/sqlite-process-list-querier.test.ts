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

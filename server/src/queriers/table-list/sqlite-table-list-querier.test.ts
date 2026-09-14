import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AsyncMutex } from '../../core/async-mutex';
import { SqliteTableRepository } from '../../repositories/table/sqlite-table-repository';
import { Table } from '../../repositories/table/table';
import { SqliteTableListQuerier } from './sqlite-table-list-querier';

test('queries a name-ordered page of tables', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db, modelDbMutex: new AsyncMutex(), dataDb: db, dataDbMutex: new AsyncMutex() } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTableRepository(dbs, { invalidate() {} });
  const querier = new SqliteTableListQuerier(dbs);

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, new Table('charlie', 'Charlie description'));
  await repository.insert(abortSignal, new Table('alpha', 'Alpha description'));
  await repository.insert(abortSignal, new Table('bravo', 'Bravo description'));

  assert.deepEqual(await querier.query(abortSignal, 2, 2), {
    tables: [{ name: 'charlie', description: 'Charlie description' }],
    totalCount: 3,
    page: 2,
    pageSize: 2
  });

  db.close();
});

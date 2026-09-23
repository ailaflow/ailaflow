import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableRepository } from '../../repositories/table/sqlite-table-repository';
import { Table } from '../../repositories/table/table';
import { SqliteTableListQuerier } from './sqlite-table-list-querier';

test('queries a name-ordered page of tables', async () => {
  const modelDb = new DatabaseSync(':memory:', { open: true });
  const dataDb = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(modelDb), dataDb: new SqliteDatabase(dataDb) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteTableRepository(dbs);
  const querier = new SqliteTableListQuerier(dbs);

  await repository.setup(signal);
  await repository.insert(signal, new Table('charlie', 'Charlie description'));
  await repository.insert(signal, new Table('alpha', 'Alpha description'));
  await repository.insert(signal, new Table('bravo', 'Bravo description'));

  assert.deepEqual(await querier.query(signal, 2, 2), {
    tables: [{ name: 'charlie', description: 'Charlie description' }],
    totalCount: 3,
    page: 2,
    pageSize: 2
  });

  modelDb.close();
  dataDb.close();
});

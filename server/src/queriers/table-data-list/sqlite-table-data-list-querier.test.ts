import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataRepository } from '../../repositories/table/sqlite-table-data-repository';
import { SqliteTableRepository } from '../../repositories/table/sqlite-table-repository';
import { SqliteTableSchemaRepository } from '../../repositories/table/sqlite-table-schema-repository';
import { TableDataRepositoryError } from '../../repositories/table/table-data-repository';
import { TableSchemaManager } from '../../repositories/table/table-schema-manager';
import { Table } from '../../repositories/table/table';
import { SqliteTableDataListQuerier } from './sqlite-table-data-list-querier';

test('queries a primary-key-ordered page of table data', async t => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db, dataDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const schemaManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const tableRepository = new SqliteTableRepository(dbs, schemaManager);
  const timestamps = [3000, 1000, 2000];
  t.mock.method(Date, 'now', () => timestamps.shift() ?? 0);
  const tableDataRepository = new SqliteTableDataRepository(dbs, schemaManager);
  const querier = new SqliteTableDataListQuerier(dbs, schemaManager);

  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));
  await tableDataRepository.upsert(abortSignal, 'customers', { _id: 'charlie', x: 3, info: ['third'] });
  await tableDataRepository.upsert(abortSignal, 'customers', { _id: 'alpha', x: 1, active: true });
  await tableDataRepository.upsert(abortSignal, 'customers', { _id: 'bravo', x: 2 });

  assert.deepEqual(await querier.query(abortSignal, 'customers', 1, 2, 'x', false), {
    rows: [
      { _id: 'charlie', _updatedAt: 3000, x: 3, info: ['third'] },
      { _id: 'bravo', _updatedAt: 2000, x: 2 }
    ],
    totalCount: 3,
    page: 1,
    pageSize: 2,
    hasMore: true
  });
  assert.deepEqual(await querier.query(abortSignal, 'customers', 2, 2, 'x', false), {
    rows: [{ _id: 'alpha', _updatedAt: 1000, x: 1, active: true }],
    totalCount: 3,
    page: 2,
    pageSize: 2,
    hasMore: false
  });

  await assert.rejects(
    () => querier.query(abortSignal, 'customers', 1, 2, 'info', true),
    error => error instanceof TableDataRepositoryError && error.message.includes('cannot be sorted')
  );

  db.close();
});

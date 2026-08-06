import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataRepository } from '../../repositories/table/sqlite-table-data-repository';
import { SqliteTableRepository } from '../../repositories/table/sqlite-table-repository';
import { TableData } from '../../repositories/table/table-data';
import { Table } from '../../repositories/table/table';
import { SqliteTableDataListQuerier } from './sqlite-table-data-list-querier';

test('queries a primary-key-ordered page of table data', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const tableRepository = new SqliteTableRepository(dbs);
  const tableDataRepository = new SqliteTableDataRepository(dbs);
  const querier = new SqliteTableDataListQuerier(dbs);

  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));
  await tableDataRepository.upsert(abortSignal, new TableData('customers', 'charlie', 'Charlie', 3000));
  await tableDataRepository.upsert(abortSignal, new TableData('customers', 'alpha', { x: 1, active: true }, 1000));
  await tableDataRepository.upsert(abortSignal, new TableData('customers', 'bravo', { x: 2 }, 2000));

  assert.deepEqual(await querier.query(abortSignal, 'customers', 1, 2), {
    rows: [
      { pk: 'alpha', data: { x: 1, active: true }, updatedAt: 1000 },
      { pk: 'bravo', data: { x: 2 }, updatedAt: 2000 }
    ],
    totalCount: 3,
    page: 1,
    pageSize: 2
  });
  assert.deepEqual(await querier.query(abortSignal, 'customers', 2, 2), {
    rows: [{ pk: 'charlie', data: 'Charlie', updatedAt: 3000 }],
    totalCount: 3,
    page: 2,
    pageSize: 2
  });

  db.close();
});

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataRepository } from '../../repositories/table/sqlite-table-data-repository';
import { SqliteTableRepository } from '../../repositories/table/sqlite-table-repository';
import { TableDataRepositoryError } from '../../repositories/table/table-data-repository';
import { TableData } from '../../repositories/table/table-data';
import { Table } from '../../repositories/table/table';
import { SqliteTableDataListQuerier } from '../../queriers/table-data-list/sqlite-table-data-list-querier';
import { ReadTablePageRpcHandler } from './read-table-page-rpc-handler';
import { TryReadTableRpcHandler } from './try-read-table-rpc-handler';
import { WriteTableRpcHandler } from './write-table-rpc-handler';

test('writes and reads table data through RPC handlers', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const tableRepository = new SqliteTableRepository(dbs);
  const tableDataRepository = new SqliteTableDataRepository(dbs);
  const readHandler = new TryReadTableRpcHandler(tableDataRepository);
  const writeHandler = new WriteTableRpcHandler(tableDataRepository);
  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));

  assert.equal(await readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', pk: 'customer_1' }), null);

  const beforeWrite = Date.now();
  assert.equal(
    await writeHandler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'customers',
      pk: 'customer_1',
      value: { name: 'Alice', tags: ['active'] }
    }),
    true
  );
  const afterWrite = Date.now();

  assert.deepEqual(await readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', pk: 'customer_1' }), {
    name: 'Alice',
    tags: ['active']
  });
  const stored = await tableDataRepository.tryGet(abortSignal, 'customers', 'customer_1');
  assert.ok(stored);
  assert.ok(stored.updatedAt >= beforeWrite && stored.updatedAt <= afterWrite);

  await writeHandler.handle(abortSignal, 'sandbox', 'execution', {
    name: 'customers',
    pk: 'customer_1',
    value: ['updated']
  });
  assert.deepEqual(await readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', pk: 'customer_1' }), ['updated']);

  db.close();
});

test('reads paginated table values through an RPC handler', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const tableRepository = new SqliteTableRepository(dbs);
  const tableDataRepository = new SqliteTableDataRepository(dbs);
  const handler = new ReadTablePageRpcHandler(new SqliteTableDataListQuerier(dbs));
  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));
  await tableDataRepository.upsert(abortSignal, new TableData('customers', 'charlie', 'Charlie', 3000));
  await tableDataRepository.upsert(abortSignal, new TableData('customers', 'alpha', { name: 'Alice' }, 1000));
  await tableDataRepository.upsert(abortSignal, new TableData('customers', 'bravo', { name: 'Bob' }, 2000));

  assert.deepEqual(await handler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', page: 1, pageSize: 2 }), {
    rows: [
      { pk: 'alpha', data: { name: 'Alice' }, updatedAt: 1000 },
      { pk: 'bravo', data: { name: 'Bob' }, updatedAt: 2000 }
    ],
    page: 1,
    hasMore: true
  });
  assert.deepEqual(await handler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', page: 2, pageSize: 2 }), {
    rows: [{ pk: 'charlie', data: 'Charlie', updatedAt: 3000 }],
    page: 2,
    hasMore: false
  });
  await assert.rejects(() => handler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', page: 0, pageSize: 2 }));
  await assert.rejects(() => handler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', page: 1, pageSize: 101 }));

  db.close();
});

test('propagates missing-table errors and validates RPC requests', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTableDataRepository(dbs);
  const readHandler = new TryReadTableRpcHandler(repository);
  const writeHandler = new WriteTableRpcHandler(repository);

  await assert.rejects(
    () => readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'missing', pk: 'pk' }),
    error => error instanceof TableDataRepositoryError && error.message === 'Table "missing" does not exist'
  );
  await assert.rejects(
    () => writeHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'missing', pk: 'pk', value: {} }),
    error => error instanceof TableDataRepositoryError && error.message === 'Table "missing" does not exist'
  );
  await assert.rejects(() => readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', pk: 1 }));
  await assert.rejects(() => writeHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', pk: 1, value: {} }));

  db.close();
});

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
import { SqliteTableDataListQuerier } from '../../queriers/table-data-list/sqlite-table-data-list-querier';
import { ReadTablePageRpcHandler } from './read-table-page-rpc-handler';
import { TryReadTableRpcHandler } from './try-read-table-rpc-handler';
import { WriteTableRpcHandler } from './write-table-rpc-handler';

test('writes and reads table data through RPC handlers', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db, dataDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const schemaManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const tableRepository = new SqliteTableRepository(dbs, schemaManager);
  const tableDataRepository = new SqliteTableDataRepository(dbs, schemaManager);
  const readHandler = new TryReadTableRpcHandler(tableDataRepository);
  const writeHandler = new WriteTableRpcHandler(tableDataRepository);
  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));

  assert.equal(await readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', _id: 'customer_1' }), null);

  const beforeWrite = Date.now();
  assert.equal(
    await writeHandler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'customers',
      row: { _id: 'customer_1', _updatedAt: 1, name: 'Alice', tags: ['active'] }
    }),
    true
  );
  const afterWrite = Date.now();

  const read = await readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', _id: 'customer_1' });
  assert.ok(read);
  assert.deepEqual(
    { ...read, _updatedAt: undefined },
    {
      _id: 'customer_1',
      _updatedAt: undefined,
      name: 'Alice',
      tags: ['active']
    }
  );
  assert.ok(read._updatedAt >= beforeWrite && read._updatedAt <= afterWrite);
  const stored = await tableDataRepository.tryGet(abortSignal, 'customers', 'customer_1');
  assert.ok(stored);
  assert.ok(stored._updatedAt >= beforeWrite && stored._updatedAt <= afterWrite);

  await writeHandler.handle(abortSignal, 'sandbox', 'execution', {
    name: 'customers',
    row: { _id: 'customer_1', name: 'updated' }
  });
  const updated = await readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', _id: 'customer_1' });
  assert.ok(updated);
  assert.equal(updated._id, 'customer_1');
  assert.equal(updated.name, 'updated');

  db.close();
});

test('reads paginated table values through an RPC handler', async t => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db, dataDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const schemaManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const tableRepository = new SqliteTableRepository(dbs, schemaManager);
  const timestamps = [3000, 1000, 2000];
  t.mock.method(Date, 'now', () => timestamps.shift() ?? 0);
  const tableDataRepository = new SqliteTableDataRepository(dbs, schemaManager);
  const handler = new ReadTablePageRpcHandler(new SqliteTableDataListQuerier(dbs, schemaManager));
  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));
  await tableDataRepository.upsert(abortSignal, 'customers', { _id: 'charlie', name: 'Charlie', priority: 3 });
  await tableDataRepository.upsert(abortSignal, 'customers', { _id: 'alpha', name: 'Alice', priority: 1 });
  await tableDataRepository.upsert(abortSignal, 'customers', { _id: 'bravo', name: 'Bob', priority: 2 });

  assert.deepEqual(
    await handler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'customers',
      page: 1,
      pageSize: 2,
      orderBy: 'priority',
      ascending: false
    }),
    {
      rows: [
        { _id: 'charlie', _updatedAt: 3000, name: 'Charlie', priority: 3 },
        { _id: 'bravo', _updatedAt: 2000, name: 'Bob', priority: 2 }
      ],
      totalCount: 3,
      page: 1,
      pageSize: 2,
      hasMore: true
    }
  );
  assert.deepEqual(
    await handler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'customers',
      page: 2,
      pageSize: 2,
      orderBy: 'priority',
      ascending: false
    }),
    {
      rows: [{ _id: 'alpha', _updatedAt: 1000, name: 'Alice', priority: 1 }],
      totalCount: 3,
      page: 2,
      pageSize: 2,
      hasMore: false
    }
  );
  await assert.rejects(() =>
    handler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'customers',
      page: 0,
      pageSize: 2,
      orderBy: '_id',
      ascending: true
    })
  );
  await assert.rejects(() =>
    handler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'customers',
      page: 1,
      pageSize: 101,
      orderBy: '_id',
      ascending: true
    })
  );

  db.close();
});

test('propagates missing-table errors and validates RPC requests', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db, dataDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const schemaManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const repository = new SqliteTableDataRepository(dbs, schemaManager);
  const readHandler = new TryReadTableRpcHandler(repository);
  const writeHandler = new WriteTableRpcHandler(repository);

  await assert.rejects(
    () => readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'missing', _id: 'id' }),
    error => error instanceof TableDataRepositoryError && error.message === 'Table "missing" does not exist'
  );
  await assert.rejects(
    () => writeHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'missing', row: { _id: 'id' } }),
    error => error instanceof TableDataRepositoryError && error.message === 'Table "missing" does not exist'
  );
  await assert.rejects(() => readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', _id: 1 }));
  await assert.rejects(() => writeHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', row: { _id: 1 } }));
  await assert.rejects(() => readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', pk: 'id' }));
  await assert.rejects(() => writeHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', pk: 'id', row: {} }));

  db.close();
});

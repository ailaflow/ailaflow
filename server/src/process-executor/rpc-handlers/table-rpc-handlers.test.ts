import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataRepository } from '../../repositories/table/sqlite-table-data-repository';
import { SqliteTableRepository } from '../../repositories/table/sqlite-table-repository';
import { SqliteTableSchemaRepository } from '../../repositories/table/sqlite-table-schema-repository';
import { TableDataRepository } from '../../repositories/table/table-data-repository';
import { Table } from '../../repositories/table/table';
import { SqliteTableDataListQuerier } from '../../queriers/table-data-list/sqlite-table-data-list-querier';
import { TableManager } from '../../table/table-manager';
import { TableSchemaManager } from '../../table/table-schema-manager';
import { ReadTablePageRpcHandler } from './read-table-page-rpc-handler';
import { TryReadTableRpcHandler } from './try-read-table-rpc-handler';
import { WriteTableRpcHandler } from './write-table-rpc-handler';

test('writes and reads table data through RPC handlers', async () => {
  const modelDb = new DatabaseSync(':memory:', { open: true });
  const dataDb = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(modelDb), dataDb: new SqliteDatabase(dataDb) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const schemaManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const tableRepository = new SqliteTableRepository(dbs);
  const tableDataRepository = new SqliteTableDataRepository(dbs);
  const tableManager = new TableManager(tableRepository, tableDataRepository, schemaManager, new SqliteTableDataListQuerier(dbs));
  const readHandler = new TryReadTableRpcHandler(tableManager);
  const writeHandler = new WriteTableRpcHandler(tableManager);
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
  const schema = await schemaManager.get(abortSignal, 'customers');
  const stored = await tableDataRepository.tryGet(abortSignal, schema, 'customer_1');
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

  modelDb.close();
  dataDb.close();
});

test('reads paginated table values through an RPC handler', async t => {
  const modelDb = new DatabaseSync(':memory:', { open: true });
  const dataDb = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(modelDb), dataDb: new SqliteDatabase(dataDb) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const schemaManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const tableRepository = new SqliteTableRepository(dbs);
  const timestamps = [3000, 1000, 2000];
  t.mock.method(Date, 'now', () => timestamps.shift() ?? 0);
  const tableDataRepository = new SqliteTableDataRepository(dbs);
  const tableManager = new TableManager(tableRepository, tableDataRepository, schemaManager, new SqliteTableDataListQuerier(dbs));
  const handler = new ReadTablePageRpcHandler(tableManager);
  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));
  await upsertTableData(abortSignal, schemaManager, tableDataRepository, 'customers', {
    _id: 'charlie',
    name: 'Charlie',
    priority: 3
  });
  await upsertTableData(abortSignal, schemaManager, tableDataRepository, 'customers', { _id: 'alpha', name: 'Alice', priority: 1 });
  await upsertTableData(abortSignal, schemaManager, tableDataRepository, 'customers', { _id: 'bravo', name: 'Bob', priority: 2 });

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
  assert.deepEqual(
    await handler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'customers',
      page: 1,
      pageSize: 10,
      orderBy: '_id',
      ascending: true,
      where: {
        priority: { $gte: 2, $lt: 3 }
      }
    }),
    {
      rows: [{ _id: 'bravo', _updatedAt: 2000, name: 'Bob', priority: 2 }],
      totalCount: 1,
      page: 1,
      pageSize: 10,
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
  await assert.rejects(() =>
    handler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'customers',
      page: 1,
      pageSize: 10,
      orderBy: '_id',
      ascending: true,
      where: { priority: 2 }
    })
  );
  await assert.rejects(() =>
    handler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'customers',
      page: 1,
      pageSize: 10,
      orderBy: '_id',
      ascending: true,
      where: { priority: {} }
    })
  );
  await assert.rejects(() =>
    handler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'customers',
      page: 1,
      pageSize: 10,
      orderBy: '_id',
      ascending: true,
      where: { priority: { $in: [1, 2] } }
    })
  );
  for (const value of [null, [2], { nested: 2 }]) {
    await assert.rejects(() =>
      handler.handle(abortSignal, 'sandbox', 'execution', {
        name: 'customers',
        page: 1,
        pageSize: 10,
        orderBy: '_id',
        ascending: true,
        where: { priority: { $eq: value } }
      })
    );
  }

  modelDb.close();
  dataDb.close();
});

test('hides table existence from scripts and validates RPC requests', async () => {
  const modelDb = new DatabaseSync(':memory:', { open: true });
  const dataDb = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(modelDb), dataDb: new SqliteDatabase(dataDb) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const schemaManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const tableRepository = new SqliteTableRepository(dbs);
  const tableDataRepository = new SqliteTableDataRepository(dbs);
  const tableManager = new TableManager(tableRepository, tableDataRepository, schemaManager, new SqliteTableDataListQuerier(dbs));
  const readHandler = new TryReadTableRpcHandler(tableManager);
  const writeHandler = new WriteTableRpcHandler(tableManager);
  const pageHandler = new ReadTablePageRpcHandler(tableManager);
  await tableRepository.setup(abortSignal);

  assert.equal(await readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'missing', _id: 'id' }), null);
  assert.deepEqual(
    await pageHandler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'missing',
      page: 2,
      pageSize: 10,
      orderBy: '_id',
      ascending: true
    }),
    { rows: [], totalCount: 0, page: 2, pageSize: 10, hasMore: false }
  );
  assert.equal(await tableRepository.tryGetByName(abortSignal, 'missing'), null);
  assert.equal(
    await writeHandler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'missing',
      row: { _id: 'id', status: 'active' }
    }),
    true
  );
  assert.deepEqual(await tableRepository.tryGetByName(abortSignal, 'missing'), new Table('missing', ''));
  const createdRow = await readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'missing', _id: 'id' });
  assert.ok(createdRow);
  assert.equal(createdRow._id, 'id');
  assert.equal(createdRow.status, 'active');
  assert.ok(createdRow._updatedAt > 0);
  await assert.rejects(() =>
    writeHandler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'missing',
      row: { _id: 'id', status: false }
    })
  );
  assert.equal(await tableManager.delete(abortSignal, 'missing'), true);
  assert.equal(await readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'missing', _id: 'id' }), null);
  assert.equal(
    await writeHandler.handle(abortSignal, 'sandbox', 'execution', {
      name: 'missing',
      row: { _id: 'new_id', amount: 10 }
    }),
    true
  );
  await assert.rejects(() => readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', _id: 1 }));
  await assert.rejects(() => writeHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', row: { _id: 1 } }));
  await assert.rejects(() => readHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', pk: 'id' }));
  await assert.rejects(() => writeHandler.handle(abortSignal, 'sandbox', 'execution', { name: 'customers', pk: 'id', row: {} }));
  assert.equal(await tableRepository.tryGetByName(abortSignal, 'customers'), null);

  modelDb.close();
  dataDb.close();
});

async function upsertTableData(
  abortSignal: AbortSignal,
  schemaManager: TableSchemaManager,
  repository: TableDataRepository,
  tableName: string,
  row: Record<string, unknown> & { _id: string }
): Promise<void> {
  const schema = await schemaManager.ensureCompatible(abortSignal, tableName, row);
  await repository.upsert(abortSignal, schema, row);
}

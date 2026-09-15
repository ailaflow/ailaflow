import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataRepository } from '../../repositories/table/sqlite-table-data-repository';
import { SqliteTableRepository } from '../../repositories/table/sqlite-table-repository';
import { SqliteTableSchemaRepository } from '../../repositories/table/sqlite-table-schema-repository';
import { TableDataRepositoryError } from '../../repositories/table/table-data-repository';
import { Table } from '../../repositories/table/table';
import { TableSchemaManager } from '../../table/table-schema-manager';
import { TableDataPageQuery } from './table-data-list-querier';
import { SqliteTableDataListQuerier } from './sqlite-table-data-list-querier';

test('queries a primary-key-ordered page of table data', async t => {
  const modelDb = new DatabaseSync(':memory:', { open: true });
  const dataDb = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(modelDb), dataDb: new SqliteDatabase(dataDb) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const schemaManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const tableRepository = new SqliteTableRepository(dbs);
  const timestamps = [3000, 1000, 2000];
  t.mock.method(Date, 'now', () => timestamps.shift() ?? 0);
  const tableDataRepository = new SqliteTableDataRepository(dbs);
  const querier = new SqliteTableDataListQuerier(dbs);

  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));
  await upsertTableData(abortSignal, schemaManager, tableDataRepository, 'customers', { _id: 'charlie', x: 3, info: ['third'] });
  await upsertTableData(abortSignal, schemaManager, tableDataRepository, 'customers', { _id: 'alpha', x: 1, active: true });
  await upsertTableData(abortSignal, schemaManager, tableDataRepository, 'customers', { _id: 'bravo', x: 2 });
  const schema = await schemaManager.get(abortSignal, 'customers');
  const queryPage = (query: TableDataPageQuery) => querier.query(abortSignal, schema, query);

  assert.deepEqual(await queryPage(createQuery({ pageSize: 2, orderBy: 'x', ascending: false })), {
    rows: [
      { _id: 'charlie', _updatedAt: 3000, x: 3, info: ['third'] },
      { _id: 'bravo', _updatedAt: 2000, x: 2 }
    ],
    page: 1,
    pageSize: 2,
    hasMore: true
  });
  assert.deepEqual(await queryPage(createQuery({ page: 2, pageSize: 2, orderBy: 'x', ascending: false })), {
    rows: [{ _id: 'alpha', _updatedAt: 1000, x: 1, active: true }],
    page: 2,
    pageSize: 2,
    hasMore: false
  });

  assert.deepEqual(
    await queryPage(
      createQuery({
        where: {
          x: { $eq: 2, $neq: 1, $lt: 3, $gt: 1, $lte: 2, $gte: 2 }
        }
      })
    ),
    {
      rows: [{ _id: 'bravo', _updatedAt: 2000, x: 2 }],
      page: 1,
      pageSize: 100,
      hasMore: false
    }
  );
  assert.deepEqual(await queryPage(createQuery({ pageSize: 2, where: { x: { $gte: 1 } } })), {
    rows: [
      { _id: 'alpha', _updatedAt: 1000, x: 1, active: true },
      { _id: 'bravo', _updatedAt: 2000, x: 2 }
    ],
    page: 1,
    pageSize: 2,
    hasMore: true
  });
  assert.deepEqual(
    await queryPage(
      createQuery({
        where: {
          _id: { $eq: 'alpha' },
          active: { $eq: true }
        }
      })
    ),
    {
      rows: [{ _id: 'alpha', _updatedAt: 1000, x: 1, active: true }],
      page: 1,
      pageSize: 100,
      hasMore: false
    }
  );
  assert.deepEqual(await queryPage(createQuery({ where: { future_column: { $eq: 'value' } } })), {
    rows: [],
    page: 1,
    pageSize: 100,
    hasMore: false
  });
  assert.deepEqual(await queryPage(createQuery({ page: 3, pageSize: 5, orderBy: 'future_column' })), {
    rows: [],
    page: 3,
    pageSize: 5,
    hasMore: false
  });

  await assert.rejects(
    () => queryPage(createQuery({ orderBy: 'info' })),
    error => error instanceof TableDataRepositoryError && error.message.includes('cannot be sorted')
  );
  await assert.rejects(
    () => queryPage(createQuery({ where: { info: { $eq: 'third' } } })),
    error => error instanceof TableDataRepositoryError && error.message.includes('cannot be filtered')
  );
  await assert.rejects(
    () => queryPage(createQuery({ where: { x: { $eq: '2' } } })),
    error => error instanceof TableDataRepositoryError && error.message.includes('expects type NUMBER but received STRING')
  );

  modelDb.close();
  dataDb.close();
});

function createQuery(overrides: Partial<TableDataPageQuery> = {}): TableDataPageQuery {
  return {
    page: 1,
    pageSize: 100,
    orderBy: '_id',
    ascending: true,
    ...overrides
  };
}

async function upsertTableData(
  abortSignal: AbortSignal,
  schemaManager: TableSchemaManager,
  repository: SqliteTableDataRepository,
  tableName: string,
  row: Record<string, unknown> & { _id: string }
): Promise<void> {
  const schema = await schemaManager.ensureCompatible(abortSignal, tableName, row);
  await repository.upsert(abortSignal, schema, row);
}

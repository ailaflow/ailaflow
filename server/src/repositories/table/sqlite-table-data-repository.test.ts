import { TableSchemaError } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AsyncMutex } from '../../core/async-mutex';
import { SqliteTableDataRepository } from './sqlite-table-data-repository';
import { SqliteTableRepository } from './sqlite-table-repository';
import { SqliteTableSchemaRepository } from './sqlite-table-schema-repository';
import { TableDataRepositoryError } from './table-data-repository';
import { TableSchemaManager } from './table-schema-manager';
import { Table } from './table';

test('upserts and deletes data in a table-specific data table', async t => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db, modelDbMutex: new AsyncMutex(), dataDb: db, dataDbMutex: new AsyncMutex() } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const tableRepository = new SqliteTableRepository(dbs, { invalidate() {} });
  const timestamps = [1000, 2000, 3000];
  t.mock.method(Date, 'now', () => timestamps.shift() ?? 0);
  const repository = createDataRepository(dbs);

  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));

  assert.equal(await repository.tryGet(abortSignal, 'customers', 'customer_1'), null);
  await repository.upsert(abortSignal, 'customers', {
    _id: 'customer_1',
    name: 'Alice',
    score: 10,
    active: true,
    details: { tags: ['new'] }
  });
  await repository.upsert(abortSignal, 'customers', { _id: 'customer_2', name: 'Bob', score: 2.5 });
  await repository.upsert(abortSignal, 'customers', { _id: 'customer_1', name: 'Alicia', active: false });

  assert.deepEqual(await repository.tryGet(abortSignal, 'customers', 'customer_1'), {
    _id: 'customer_1',
    _updatedAt: 3000,
    name: 'Alicia',
    active: false
  });

  assert.deepEqual(
    toPlainRows(db.prepare(`SELECT _id, _updatedAt, name, score, active, details FROM data_customers ORDER BY _id`)).map(row => ({
      ...row,
      details: row.details === null ? null : JSON.parse(Buffer.from(row.details as Uint8Array).toString('utf8'))
    })),
    [
      { _id: 'customer_1', _updatedAt: 3000, name: 'Alicia', score: null, active: 0, details: null },
      { _id: 'customer_2', _updatedAt: 2000, name: 'Bob', score: 2.5, active: null, details: null }
    ]
  );

  await repository.delete(abortSignal, 'customers', 'customer_1');
  assert.equal(await repository.tryGet(abortSignal, 'customers', 'customer_1'), null);
  assert.deepEqual(toPlainRows(db.prepare(`SELECT _id FROM data_customers`)), [{ _id: 'customer_2' }]);

  db.close();
});

test('reports a repository error when the data table does not exist', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { dataDb: db, dataDbMutex: new AsyncMutex() } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = createDataRepository(dbs);

  await assertMissingTableError(() => repository.tryGet(abortSignal, 'missing', 'id'));
  await assertMissingTableError(() => repository.upsert(abortSignal, 'missing', { _id: 'id' }));
  await assertMissingTableError(() => repository.delete(abortSignal, 'missing', 'id'));

  db.close();
});

test('rejects null values and changes to established column types', async t => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db, modelDbMutex: new AsyncMutex(), dataDb: db, dataDbMutex: new AsyncMutex() } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  t.mock.method(Date, 'now', () => 1000);
  const tableRepository = new SqliteTableRepository(dbs, { invalidate() {} });
  const repository = createDataRepository(dbs);
  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));
  await repository.upsert(abortSignal, 'customers', { _id: 'customer_1', score: 1 });

  await assert.rejects(
    () => repository.upsert(abortSignal, 'customers', { _id: 'customer_1', score: 'one' }),
    error => error instanceof TableSchemaError && error.message === 'Column "score" expects type NUMBER but received STRING'
  );
  await assert.rejects(
    () => repository.upsert(abortSignal, 'customers', { _id: 'customer_1', score: null }),
    error => error instanceof TableSchemaError && error.message === 'Column "score" is not allowed to have a null value'
  );
  assert.deepEqual(await repository.tryGet(abortSignal, 'customers', 'customer_1'), { _id: 'customer_1', _updatedAt: 1000, score: 1 });

  db.close();
});

function toPlainRows(statement: ReturnType<DatabaseSync['prepare']>): Record<string, unknown>[] {
  return statement.all().map(row => ({ ...row }));
}

function createDataRepository(dbs: SqliteDatabases): SqliteTableDataRepository {
  const schemaManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  return new SqliteTableDataRepository(dbs, schemaManager);
}

async function assertMissingTableError(action: () => Promise<unknown>): Promise<void> {
  await assert.rejects(action, error => error instanceof TableDataRepositoryError && error.message === 'Table "missing" does not exist');
}

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableDataRepository } from './sqlite-table-data-repository';
import { SqliteTableRepository } from './sqlite-table-repository';
import { TableData } from './table-data';
import { TableDataRepositoryError } from './table-data-repository';
import { Table } from './table';

test('upserts and deletes data in a table-specific data table', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const tableRepository = new SqliteTableRepository(dbs);
  const repository = new SqliteTableDataRepository(dbs);

  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));

  assert.equal(await repository.tryGet(abortSignal, 'customers', 'customer_1'), null);
  await repository.upsert(abortSignal, new TableData('customers', 'customer_1', { name: 'Alice' }, 1000));
  await repository.upsert(abortSignal, new TableData('customers', 'customer_2', ['Bob'], 2000));
  await repository.upsert(abortSignal, new TableData('customers', 'customer_1', { name: 'Alicia' }, 3000));

  assert.deepEqual(
    await repository.tryGet(abortSignal, 'customers', 'customer_1'),
    new TableData('customers', 'customer_1', { name: 'Alicia' }, 3000)
  );

  assert.deepEqual(
    toPlainRows(db.prepare(`SELECT pk, data, updatedAt FROM data_customers ORDER BY pk`)).map(row => ({
      ...row,
      data: JSON.parse(row.data as string)
    })),
    [
      { pk: 'customer_1', data: { name: 'Alicia' }, updatedAt: 3000 },
      { pk: 'customer_2', data: ['Bob'], updatedAt: 2000 }
    ]
  );

  await repository.delete(abortSignal, 'customers', 'customer_1');
  assert.equal(await repository.tryGet(abortSignal, 'customers', 'customer_1'), null);
  assert.deepEqual(toPlainRows(db.prepare(`SELECT pk FROM data_customers`)), [{ pk: 'customer_2' }]);

  db.close();
});

test('reports a repository error when the data table does not exist', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTableDataRepository(dbs);

  await assertMissingTableError(() => repository.tryGet(abortSignal, 'missing', 'pk'));
  await assertMissingTableError(() => repository.upsert(abortSignal, new TableData('missing', 'pk', {}, 1000)));
  await assertMissingTableError(() => repository.delete(abortSignal, 'missing', 'pk'));

  db.close();
});

function toPlainRows(statement: ReturnType<DatabaseSync['prepare']>): Record<string, unknown>[] {
  return statement.all().map(row => ({ ...row }));
}

async function assertMissingTableError(action: () => Promise<unknown>): Promise<void> {
  await assert.rejects(action, error => error instanceof TableDataRepositoryError && error.message === 'Table "missing" does not exist');
}

import { TableColumnType } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AsyncMutex } from '../../core/async-mutex';
import { SqliteTableRepository } from './sqlite-table-repository';
import { SqliteTableSchemaRepository } from './sqlite-table-schema-repository';
import { TableSchemaManager } from './table-schema-manager';
import { TableSchemaConcurrencyError } from './table-schema-repository';
import { Table } from './table';

test('loads and saves an append-only SQLite table schema', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db, modelDbMutex: new AsyncMutex(), dataDb: db, dataDbMutex: new AsyncMutex() } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const tableRepository = new SqliteTableRepository(dbs, { invalidate() {} });
  const schemaRepository = new SqliteTableSchemaRepository(dbs);
  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));

  const initial = await schemaRepository.get(abortSignal, 'customers');
  const extended = initial.tryExtend({ _id: 'customer_1', name: 'Alice', score: 1, active: true, details: { source: 'web' } });
  assert.ok(extended);

  const saved = await schemaRepository.save(abortSignal, extended);
  assert.deepEqual(saved.columns, [
    { name: 'name', type: TableColumnType.STRING },
    { name: 'score', type: TableColumnType.NUMBER },
    { name: 'active', type: TableColumnType.BOOLEAN },
    { name: 'details', type: TableColumnType.JSON }
  ]);
  assert.deepEqual(saved.newColumns, []);
  assert.deepEqual(
    db
      .prepare('PRAGMA table_info(data_customers)')
      .all()
      .map(column => ({ name: column.name, type: column.type })),
    [
      { name: '_id', type: 'TEXT' },
      { name: '_updatedAt', type: 'INTEGER' },
      { name: 'name', type: 'TEXT' },
      { name: 'score', type: 'REAL' },
      { name: 'active', type: 'INTEGER' },
      { name: 'details', type: 'BLOB' }
    ]
  );

  await assert.rejects(() => schemaRepository.save(abortSignal, extended), TableSchemaConcurrencyError);
  db.close();
});

test('reloads after another schema manager creates the same column', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db, modelDbMutex: new AsyncMutex(), dataDb: db, dataDbMutex: new AsyncMutex() } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const firstManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const secondManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const tableRepository = new SqliteTableRepository(dbs, firstManager);
  await tableRepository.setup(abortSignal);
  await tableRepository.insert(abortSignal, new Table('customers', 'Customer records'));
  await secondManager.get(abortSignal, 'customers');

  await firstManager.ensureCompatible(abortSignal, 'customers', { _id: 'customer_1', score: 1 });
  const schema = await secondManager.ensureCompatible(abortSignal, 'customers', { _id: 'customer_2', score: 2 });

  assert.deepEqual(schema.columns, [{ name: 'score', type: TableColumnType.NUMBER }]);
  assert.deepEqual(schema.newColumns, []);
  db.close();
});

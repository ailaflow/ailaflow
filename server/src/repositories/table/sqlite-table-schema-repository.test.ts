import { TableColumnType } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableRepository } from './sqlite-table-repository';
import { SqliteTableSchemaRepository } from './sqlite-table-schema-repository';
import { TableSchemaManager } from '../../table/table-schema-manager';
import { TableSchemaConcurrencyError } from './table-schema-repository';
import { Table } from './table';

test('loads and saves an append-only SQLite table schema', async () => {
  const modelDb = new DatabaseSync(':memory:', { open: true });
  const dataDb = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(modelDb), dataDb: new SqliteDatabase(dataDb) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const tableRepository = new SqliteTableRepository(dbs);
  const schemaRepository = new SqliteTableSchemaRepository(dbs);
  await tableRepository.setup(signal);
  assert.equal(await schemaRepository.tryGet(signal, 'missing'), null);
  await tableRepository.insert(signal, new Table('customers', 'Customer records'));

  const initial = await schemaRepository.get(signal, 'customers');
  const extended = initial.tryExtend({ _id: 'customer_1', name: 'Alice', score: 1, active: true, details: { source: 'web' } });
  assert.ok(extended);

  const saved = await schemaRepository.save(signal, extended);
  assert.deepEqual(saved.columns, [
    { name: 'name', type: TableColumnType.STRING },
    { name: 'score', type: TableColumnType.NUMBER },
    { name: 'active', type: TableColumnType.BOOLEAN },
    { name: 'details', type: TableColumnType.JSON }
  ]);
  assert.deepEqual(saved.newColumns, []);
  assert.deepEqual(
    dataDb
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

  await assert.rejects(() => schemaRepository.save(signal, extended), TableSchemaConcurrencyError);
  modelDb.close();
  dataDb.close();
});

test('reloads after another schema manager creates the same column', async () => {
  const modelDb = new DatabaseSync(':memory:', { open: true });
  const dataDb = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(modelDb), dataDb: new SqliteDatabase(dataDb) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const firstManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const secondManager = new TableSchemaManager(new SqliteTableSchemaRepository(dbs));
  const tableRepository = new SqliteTableRepository(dbs);
  await tableRepository.setup(signal);
  await tableRepository.insert(signal, new Table('customers', 'Customer records'));
  await secondManager.get(signal, 'customers');

  await firstManager.ensureCompatible(signal, 'customers', { _id: 'customer_1', score: 1 });
  const schema = await secondManager.ensureCompatible(signal, 'customers', { _id: 'customer_2', score: 2 });

  assert.deepEqual(schema.columns, [{ name: 'score', type: TableColumnType.NUMBER }]);
  assert.deepEqual(schema.newColumns, []);
  modelDb.close();
  dataDb.close();
});

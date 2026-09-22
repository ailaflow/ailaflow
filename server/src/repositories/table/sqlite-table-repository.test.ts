import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableRepository } from './sqlite-table-repository';
import { Table } from './table';

test('manages table definitions and their data tables', async () => {
  const modelDb = new DatabaseSync(':memory:', { open: true });
  const dataDb = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(modelDb), dataDb: new SqliteDatabase(dataDb) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteTableRepository(dbs);

  await repository.setup(signal);
  await repository.insert(signal, new Table('customers', 'Customer records'));

  assert.deepEqual(await repository.tryGetByName(signal, 'customers'), new Table('customers', 'Customer records'));
  assert.deepEqual(toPlainRows(modelDb.prepare(`SELECT name, description FROM tables`)), [
    { name: 'customers', description: 'Customer records' }
  ]);
  assert.deepEqual(
    toPlainRows(dataDb.prepare(`PRAGMA table_info(data_customers)`)).map(row => ({
      name: row.name,
      type: row.type,
      notnull: row.notnull,
      primaryKeyPosition: row.pk
    })),
    [
      { name: '_id', type: 'TEXT', notnull: 1, primaryKeyPosition: 1 },
      { name: '_updatedAt', type: 'INTEGER', notnull: 1, primaryKeyPosition: 0 }
    ]
  );

  await repository.update(signal, new Table('customers', 'Updated description'));
  assert.deepEqual(toPlainRows(modelDb.prepare(`SELECT name, description FROM tables`)), [
    { name: 'customers', description: 'Updated description' }
  ]);

  assert.equal(await repository.delete(signal, 'customers'), true);
  assert.equal(await repository.delete(signal, 'customers'), false);
  assert.equal(await repository.tryGetByName(signal, 'customers'), null);
  assert.deepEqual(toPlainRows(modelDb.prepare(`SELECT name, description FROM tables`)), []);
  assert.equal(tableExists(dataDb, 'data_customers'), false);

  modelDb.close();
  dataDb.close();
});

test('rolls back a definition insert when its data table cannot be created', async () => {
  const modelDb = new DatabaseSync(':memory:', { open: true });
  const dataDb = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(modelDb), dataDb: new SqliteDatabase(dataDb) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteTableRepository(dbs);

  await repository.setup(signal);
  dataDb.exec(`CREATE TABLE data_customers (legacyId TEXT PRIMARY KEY)`);

  await assert.rejects(() => repository.insert(signal, new Table('customers', 'Customer records')));
  assert.deepEqual(toPlainRows(modelDb.prepare(`SELECT name, description FROM tables`)), []);

  modelDb.close();
  dataDb.close();
});

function tableExists(db: DatabaseSync, name: string): boolean {
  return Boolean(
    db
      .prepare(
        `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = ?
        LIMIT 1
      `
      )
      .get(name)
  );
}

function toPlainRows(statement: ReturnType<DatabaseSync['prepare']>): Record<string, unknown>[] {
  return statement.all().map(row => ({ ...row }));
}

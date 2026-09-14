import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AsyncMutex } from '../../core/async-mutex';
import { SqliteTableRepository } from './sqlite-table-repository';
import { Table } from './table';

test('manages table definitions and their data tables', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db, modelDbMutex: new AsyncMutex(), dataDb: db, dataDbMutex: new AsyncMutex() } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTableRepository(dbs, { invalidate() {} });

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, new Table('customers', 'Customer records'));

  assert.deepEqual(await repository.tryGetByName(abortSignal, 'customers'), new Table('customers', 'Customer records'));
  assert.deepEqual(toPlainRows(db.prepare(`SELECT name, description FROM tables`)), [
    { name: 'customers', description: 'Customer records' }
  ]);
  assert.deepEqual(
    toPlainRows(db.prepare(`PRAGMA table_info(data_customers)`)).map(row => ({
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

  await repository.update(abortSignal, new Table('customers', 'Updated description'));
  assert.deepEqual(toPlainRows(db.prepare(`SELECT name, description FROM tables`)), [
    { name: 'customers', description: 'Updated description' }
  ]);

  assert.equal(await repository.delete(abortSignal, 'customers'), true);
  assert.equal(await repository.delete(abortSignal, 'customers'), false);
  assert.equal(await repository.tryGetByName(abortSignal, 'customers'), null);
  assert.deepEqual(toPlainRows(db.prepare(`SELECT name, description FROM tables`)), []);
  assert.equal(tableExists(db, 'data_customers'), false);

  db.close();
});

test('rolls back a definition insert when its data table cannot be created', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db, modelDbMutex: new AsyncMutex(), dataDb: db, dataDbMutex: new AsyncMutex() } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTableRepository(dbs, { invalidate() {} });

  await repository.setup(abortSignal);
  db.exec(`CREATE TABLE data_customers (legacyId TEXT PRIMARY KEY)`);

  await assert.rejects(() => repository.insert(abortSignal, new Table('customers', 'Customer records')));
  assert.deepEqual(toPlainRows(db.prepare(`SELECT name, description FROM tables`)), []);

  db.close();
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

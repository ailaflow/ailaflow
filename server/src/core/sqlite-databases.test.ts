import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from './sqlite-database';
import { SqliteDatabases } from './sqlite-databases';
import { ServerPaths } from './server-paths';
import { Transaction } from './transaction';

test('sqlite databases set up table versions independently', async () => {
  const dataFolderPath = mkdtempSync(join(tmpdir(), 'aila-sqlite-databases-'));
  const serverPaths = {
    getAppDataFolderPath: () => dataFolderPath
  } as ServerPaths;
  const databases = new SqliteDatabases(serverPaths);

  try {
    const modelVersions: number[] = [];
    const dataVersions: number[] = [];
    const chatVersions: number[] = [];

    await databases.modelDb.setup(1, 'users', (_, version) => modelVersions.push(version));
    await databases.modelDb.setup(1, 'users', (_, version) => modelVersions.push(version));
    await databases.dataDb.setup(1, 'users', (_, version) => dataVersions.push(version));
    await databases.chatDb.setup(1, 'users', (_, version) => chatVersions.push(version));
    await databases.modelDb.setup(2, 'users', (_, version) => modelVersions.push(version));
    await databases.modelDb.setup(1, 'users', (_, version) => modelVersions.push(version));

    assert.deepEqual(modelVersions, [0, 1]);
    assert.deepEqual(dataVersions, [0]);
    assert.deepEqual(chatVersions, [0]);
  } finally {
    databases.dispose();
    rmSync(dataFolderPath, { recursive: true });
  }
});

test('sqlite database holds the mutex after a failed commit until rollback', { timeout: 1000 }, async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('CREATE TABLE parents (id INTEGER PRIMARY KEY) STRICT');
  db.exec(`
    CREATE TABLE children (
      parentId INTEGER REFERENCES parents(id) DEFERRABLE INITIALLY DEFERRED
    ) STRICT
  `);
  const sqliteDb = new SqliteDatabase(db);
  const transaction = Transaction.begin();

  await sqliteDb.write(db => {
    db.prepare('INSERT INTO children (parentId) VALUES (?)').run(1);
  }, transaction);

  await assert.rejects(() => transaction.commit());

  let nextTransactionStarted = false;
  const nextTransactionPromise = sqliteDb.write(() => {
    nextTransactionStarted = true;
  });
  await Promise.resolve();

  assert.equal(nextTransactionStarted, false);

  await transaction.rollback();
  await nextTransactionPromise;

  db.close();
});

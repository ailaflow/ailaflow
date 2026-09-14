import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { AsyncMutex } from './async-mutex';
import { SqliteTransaction } from './sqlite-transaction';

test('sqlite transaction holds the mutex after a failed commit until rollback', { timeout: 1000 }, async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('CREATE TABLE parents (id INTEGER PRIMARY KEY) STRICT');
  db.exec(`
    CREATE TABLE children (
      parentId INTEGER REFERENCES parents(id) DEFERRABLE INITIALLY DEFERRED
    ) STRICT
  `);
  const mutex = new AsyncMutex();
  const transaction = await SqliteTransaction.begin(db, mutex);

  db.prepare('INSERT INTO children (parentId) VALUES (?)').run(1);

  await assert.rejects(() => transaction.commit());

  let nextTransactionStarted = false;
  const nextTransactionPromise = SqliteTransaction.begin(db, mutex).then(nextTransaction => {
    nextTransactionStarted = true;
    return nextTransaction;
  });
  await Promise.resolve();

  assert.equal(nextTransactionStarted, false);

  await transaction.rollback();

  const nextTransaction = await nextTransactionPromise;
  await nextTransaction.rollback();

  db.close();
});

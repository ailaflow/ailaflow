import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from './sqlite-databases';
import { Transaction } from './transaction';

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

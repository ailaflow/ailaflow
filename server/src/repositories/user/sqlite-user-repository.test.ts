import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteUserRepository } from './sqlite-user-repository';
import { User } from './user';

test('counts active users or all users', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteUserRepository(dbs);

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, new User('alice', 'hash', true, false));
  await repository.insert(abortSignal, new User('bob', 'hash', false, false));

  assert.equal(await repository.count(abortSignal, true), 1);
  assert.equal(await repository.count(abortSignal, false), 2);

  db.close();
});

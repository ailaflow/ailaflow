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
  await repository.insert(abortSignal, new User('alice', null, 'hash', true, false));
  await repository.insert(abortSignal, new User('bob', null, 'hash', false, false));

  assert.equal(await repository.count(abortSignal, true), 1);
  assert.equal(await repository.count(abortSignal, false), 2);

  db.close();
});

test('stores and updates an optional email', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteUserRepository(dbs);

  await repository.setup(abortSignal);
  const user = new User('alice', 'alice@example.com', 'hash', true, false);
  await repository.insert(abortSignal, user);

  assert.equal((await repository.tryGetUser(abortSignal, user.name))?.email, 'alice@example.com');

  user.setEmail(null);
  await repository.update(abortSignal, user);

  assert.equal((await repository.tryGetUser(abortSignal, user.name))?.email, null);

  db.close();
});

test('rejects duplicate non-null emails', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteUserRepository(dbs);

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, new User('alice', 'shared@example.com', 'hash', true, false));

  await assert.rejects(repository.insert(abortSignal, new User('bob', 'shared@example.com', 'hash', true, false)), {
    message: 'An email is already in use'
  });

  const bob = new User('bob', null, 'hash', true, false);
  await repository.insert(abortSignal, bob);
  bob.setEmail('shared@example.com');

  await assert.rejects(repository.update(abortSignal, bob), { message: 'An email is already in use' });

  db.close();
});

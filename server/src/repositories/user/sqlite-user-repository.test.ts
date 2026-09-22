import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteUserRepository } from './sqlite-user-repository';
import { User } from './user';

test('counts active users or all users', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteUserRepository(dbs);

  await repository.setup(signal);
  await repository.insert(signal, new User('alice', null, 'hash', true, false));
  await repository.insert(signal, new User('bob', null, 'hash', false, false));

  assert.equal(await repository.count(signal, true), 1);
  assert.equal(await repository.count(signal, false), 2);

  db.close();
});

test('stores and updates an optional email', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteUserRepository(dbs);

  await repository.setup(signal);
  const user = new User('alice', 'alice@example.com', 'hash', true, false);
  await repository.insert(signal, user);

  assert.equal((await repository.tryGetUser(signal, user.name))?.email, 'alice@example.com');

  user.setEmail(null);
  await repository.update(signal, user);

  assert.equal((await repository.tryGetUser(signal, user.name))?.email, null);

  db.close();
});

test('rejects duplicate non-null emails', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteUserRepository(dbs);

  await repository.setup(signal);
  await repository.insert(signal, new User('alice', 'shared@example.com', 'hash', true, false));

  await assert.rejects(repository.insert(signal, new User('bob', 'shared@example.com', 'hash', true, false)), {
    message: 'An email is already in use'
  });

  const bob = new User('bob', null, 'hash', true, false);
  await repository.insert(signal, bob);
  bob.setEmail('shared@example.com');

  await assert.rejects(repository.update(signal, bob), { message: 'An email is already in use' });

  db.close();
});

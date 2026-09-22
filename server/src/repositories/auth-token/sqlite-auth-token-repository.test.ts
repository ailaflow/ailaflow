import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { AuthToken } from './auth-token';
import { SqliteAuthTokenRepository } from './sqlite-auth-token-repository';

test('upserts auth tokens', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteAuthTokenRepository(dbs);

  await repository.setup(signal);
  await repository.upsert(signal, new AuthToken('token', 'alice', 1000, false));
  await repository.upsert(signal, new AuthToken('token', 'bob', 2000, true));

  assert.deepEqual(await repository.tryGetByToken(signal, 'token'), new AuthToken('token', 'bob', 2000, true));

  db.close();
});

test('deletes only outdated auth tokens', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteAuthTokenRepository(dbs);

  await repository.setup(signal);
  await repository.upsert(signal, new AuthToken('outdated', 'alice', 999, false));
  await repository.upsert(signal, new AuthToken('expires-now', 'bob', 1000, false));
  await repository.upsert(signal, new AuthToken('current', 'charlie', 1001, true));

  await repository.deleteOutdated(signal, 1000);

  assert.equal(await repository.tryGetByToken(signal, 'outdated'), null);
  assert.notEqual(await repository.tryGetByToken(signal, 'expires-now'), null);
  assert.notEqual(await repository.tryGetByToken(signal, 'current'), null);

  db.close();
});

test('deletes auth tokens only for the selected user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteAuthTokenRepository(dbs);

  await repository.setup(signal);
  await repository.upsert(signal, new AuthToken('alice-first', 'alice', 1000, false));
  await repository.upsert(signal, new AuthToken('alice-second', 'alice', 1000, false));
  await repository.upsert(signal, new AuthToken('bob-token', 'bob', 1000, false));

  await repository.deleteForUser(signal, 'alice');

  assert.equal(await repository.tryGetByToken(signal, 'alice-first'), null);
  assert.equal(await repository.tryGetByToken(signal, 'alice-second'), null);
  assert.notEqual(await repository.tryGetByToken(signal, 'bob-token'), null);

  db.close();
});

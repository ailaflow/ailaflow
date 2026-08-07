import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AuthToken } from './auth-token';
import { SqliteAuthTokenRepository } from './sqlite-auth-token-repository';

test('deletes only outdated auth tokens', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { authTokenDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteAuthTokenRepository(dbs);

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, new AuthToken('outdated', 'alice', 999, false));
  await repository.insert(abortSignal, new AuthToken('expires-now', 'bob', 1000, false));
  await repository.insert(abortSignal, new AuthToken('current', 'charlie', 1001, true));

  await repository.deleteOutdated(abortSignal, 1000);

  assert.equal(await repository.tryGetByToken(abortSignal, 'outdated'), null);
  assert.notEqual(await repository.tryGetByToken(abortSignal, 'expires-now'), null);
  assert.notEqual(await repository.tryGetByToken(abortSignal, 'current'), null);

  db.close();
});

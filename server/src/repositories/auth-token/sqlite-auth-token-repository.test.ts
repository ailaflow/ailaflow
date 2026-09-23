import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteUserRepository } from '../user/sqlite-user-repository';
import { User } from '../user/user';
import { AuthToken } from './auth-token';
import { SqliteAuthTokenRepository } from './sqlite-auth-token-repository';

test('upserts auth tokens', async () => {
  const { db, signal, authTokenRepository } = await setup(['alice', 'bob']);

  await authTokenRepository.upsert(signal, new AuthToken('token', 'alice', 1000, false));
  await authTokenRepository.upsert(signal, new AuthToken('token', 'bob', 2000, true));

  assert.deepEqual(await authTokenRepository.tryGetByToken(signal, 'token'), new AuthToken('token', 'bob', 2000, true));

  db.close();
});

test('deletes only outdated auth tokens', async () => {
  const { db, signal, authTokenRepository } = await setup(['alice', 'bob', 'charlie']);

  await authTokenRepository.upsert(signal, new AuthToken('outdated', 'alice', 999, false));
  await authTokenRepository.upsert(signal, new AuthToken('expires-now', 'bob', 1000, false));
  await authTokenRepository.upsert(signal, new AuthToken('current', 'charlie', 1001, true));

  await authTokenRepository.deleteOutdated(signal, 1000);

  assert.equal(await authTokenRepository.tryGetByToken(signal, 'outdated'), null);
  assert.notEqual(await authTokenRepository.tryGetByToken(signal, 'expires-now'), null);
  assert.notEqual(await authTokenRepository.tryGetByToken(signal, 'current'), null);

  db.close();
});

test('deletes auth tokens only for the selected user', async () => {
  const { db, signal, authTokenRepository } = await setup(['alice', 'bob']);

  await authTokenRepository.upsert(signal, new AuthToken('alice-first', 'alice', 1000, false));
  await authTokenRepository.upsert(signal, new AuthToken('alice-second', 'alice', 1000, false));
  await authTokenRepository.upsert(signal, new AuthToken('bob-token', 'bob', 1000, false));

  await authTokenRepository.deleteForUser(signal, 'alice');

  assert.equal(await authTokenRepository.tryGetByToken(signal, 'alice-first'), null);
  assert.equal(await authTokenRepository.tryGetByToken(signal, 'alice-second'), null);
  assert.notEqual(await authTokenRepository.tryGetByToken(signal, 'bob-token'), null);

  db.close();
});

test('requires an existing user and deletes their auth tokens with them', async () => {
  const { db, signal, authTokenRepository } = await setup(['alice']);

  await authTokenRepository.upsert(signal, new AuthToken('alice-token', 'alice', 1000, false));

  await assert.rejects(authTokenRepository.upsert(signal, new AuthToken('missing-token', 'missing', 1000, false)), {
    message: /FOREIGN KEY constraint failed/
  });

  db.prepare(`DELETE FROM users WHERE name = ?`).run('alice');

  assert.equal(await authTokenRepository.tryGetByToken(signal, 'alice-token'), null);
  db.close();
});

async function setup(userNames: string[]) {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(dbs);
  const authTokenRepository = new SqliteAuthTokenRepository(dbs);

  await userRepository.setup(signal);
  await authTokenRepository.setup(signal);
  for (const userName of userNames) {
    await userRepository.insert(signal, new User(userName, null, 'hash', true, false));
  }

  return { db, signal, authTokenRepository };
}

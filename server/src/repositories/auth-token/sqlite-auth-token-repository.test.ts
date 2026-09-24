import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteUserRepository } from '../user/sqlite-user-repository';
import { User } from '../user/user';
import { AuthToken } from './auth-token';
import { SqliteAuthTokenRepository } from './sqlite-auth-token-repository';

test('upserts auth tokens', async () => {
  const { db, signal, authTokenRepository } = await setup(['alice', 'bob']);

  await authTokenRepository.upsert(signal, createAuthToken('token', 'alice', 1000, false));
  await authTokenRepository.upsert(signal, createAuthToken('token', 'bob', 2000, true));

  assert.deepEqual(
    await authTokenRepository.tryGetByTokenHash(signal, AuthToken.hashToken('token')),
    new AuthToken(null, AuthToken.hashToken('token'), 'bob', 2000, true)
  );
  const storedRow = db.prepare(`SELECT tokenHash FROM auth_tokens`).get() as { tokenHash: string };
  assert.equal(storedRow.tokenHash, AuthToken.hashToken('token'));

  db.close();
});

test('deletes only outdated auth tokens', async () => {
  const { db, signal, authTokenRepository } = await setup(['alice', 'bob', 'charlie']);

  await authTokenRepository.upsert(signal, createAuthToken('outdated', 'alice', 999, false));
  await authTokenRepository.upsert(signal, createAuthToken('expires-now', 'bob', 1000, false));
  await authTokenRepository.upsert(signal, createAuthToken('current', 'charlie', 1001, true));

  await authTokenRepository.deleteOutdated(signal, 1000);

  assert.equal(await authTokenRepository.tryGetByTokenHash(signal, AuthToken.hashToken('outdated')), null);
  assert.notEqual(await authTokenRepository.tryGetByTokenHash(signal, AuthToken.hashToken('expires-now')), null);
  assert.notEqual(await authTokenRepository.tryGetByTokenHash(signal, AuthToken.hashToken('current')), null);

  db.close();
});

test('deletes auth tokens only for the selected user', async () => {
  const { db, signal, authTokenRepository } = await setup(['alice', 'bob']);

  await authTokenRepository.upsert(signal, createAuthToken('alice-first', 'alice', 1000, false));
  await authTokenRepository.upsert(signal, createAuthToken('alice-second', 'alice', 1000, false));
  await authTokenRepository.upsert(signal, createAuthToken('bob-token', 'bob', 1000, false));

  await authTokenRepository.deleteForUser(signal, 'alice');

  assert.equal(await authTokenRepository.tryGetByTokenHash(signal, AuthToken.hashToken('alice-first')), null);
  assert.equal(await authTokenRepository.tryGetByTokenHash(signal, AuthToken.hashToken('alice-second')), null);
  assert.notEqual(await authTokenRepository.tryGetByTokenHash(signal, AuthToken.hashToken('bob-token')), null);

  db.close();
});

test('requires an existing user and deletes their auth tokens with them', async () => {
  const { db, signal, authTokenRepository } = await setup(['alice']);

  await authTokenRepository.upsert(signal, createAuthToken('alice-token', 'alice', 1000, false));

  await assert.rejects(authTokenRepository.upsert(signal, createAuthToken('missing-token', 'missing', 1000, false)), {
    message: /FOREIGN KEY constraint failed/
  });

  db.prepare(`DELETE FROM users WHERE name = ?`).run('alice');

  assert.equal(await authTokenRepository.tryGetByTokenHash(signal, AuthToken.hashToken('alice-token')), null);
  db.close();
});

function createAuthToken(token: string, userName: string, expiresAt: number, isAdmin: boolean): AuthToken {
  return new AuthToken(token, AuthToken.hashToken(token), userName, expiresAt, isAdmin);
}

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

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteUserRepository } from '../user/sqlite-user-repository';
import { User } from '../user/user';
import { MagicLink } from './magic-link';
import { SqliteMagicLinkRepository } from './sqlite-magic-link-repository';

test('consumes a valid magic link only once', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const databases = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(databases);
  const repository = new SqliteMagicLinkRepository(databases);
  await userRepository.setup(abortSignal);
  await repository.setup(abortSignal);
  await userRepository.insert(abortSignal, new User('alice', null, 'hash', true, false));
  await repository.insert(abortSignal, new MagicLink('secret-token', 'alice', 2_000));

  assert.equal(await repository.consume(abortSignal, 'wrong-token', 1_000), null);
  assert.equal(await repository.consume(abortSignal, 'secret-token', 1_000), 'alice');
  assert.equal(await repository.consume(abortSignal, 'secret-token', 1_000), null);

  db.close();
});

test('rejects and deletes expired magic links', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const databases = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(databases);
  const repository = new SqliteMagicLinkRepository(databases);
  await userRepository.setup(abortSignal);
  await repository.setup(abortSignal);
  await userRepository.insert(abortSignal, new User('alice', null, 'hash', true, false));
  await repository.insert(abortSignal, new MagicLink('expired-token', 'alice', 1_000));

  assert.equal(await repository.consume(abortSignal, 'expired-token', 1_000), null);
  await repository.deleteExpired(abortSignal, 1_000);

  const row = db.prepare(`SELECT token FROM magic_links WHERE token = ?`).get('expired-token');
  assert.equal(row, undefined);
  db.close();
});

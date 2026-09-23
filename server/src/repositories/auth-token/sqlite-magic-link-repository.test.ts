import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteUserRepository } from '../user/sqlite-user-repository';
import { User } from '../user/user';
import { MagicLink } from './magic-link';
import { SqliteMagicLinkRepository } from './sqlite-magic-link-repository';

test('consumes a valid magic link only once', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const databases = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(databases);
  const repository = new SqliteMagicLinkRepository(databases);
  await userRepository.setup(signal);
  await repository.setup(signal);
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));
  await repository.insert(signal, new MagicLink('secret-token', MagicLink.hashToken('secret-token'), 'alice', 2_000));

  const storedRow = db.prepare(`SELECT tokenHash FROM magic_links`).get() as { tokenHash: string };
  assert.equal(storedRow.tokenHash, MagicLink.hashToken('secret-token'));

  assert.equal(await repository.consume(signal, MagicLink.hashToken('wrong-token'), 1_000), null);
  assert.equal(await repository.consume(signal, MagicLink.hashToken('secret-token'), 1_000), 'alice');
  assert.equal(await repository.consume(signal, MagicLink.hashToken('secret-token'), 1_000), null);

  db.close();
});

test('rejects and deletes expired magic links', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const databases = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(databases);
  const repository = new SqliteMagicLinkRepository(databases);
  await userRepository.setup(signal);
  await repository.setup(signal);
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));
  await repository.insert(signal, new MagicLink('expired-token', MagicLink.hashToken('expired-token'), 'alice', 1_000));

  assert.equal(await repository.consume(signal, MagicLink.hashToken('expired-token'), 1_000), null);
  await repository.deleteExpired(signal, 1_000);

  const row = db.prepare(`SELECT tokenHash FROM magic_links`).get();
  assert.equal(row, undefined);
  db.close();
});

test('deletes all magic links for a user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const databases = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(databases);
  const repository = new SqliteMagicLinkRepository(databases);
  await userRepository.setup(signal);
  await repository.setup(signal);
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));
  await userRepository.insert(signal, new User('bob', null, 'hash', true, false));
  await repository.insert(signal, new MagicLink('alice-token-1', MagicLink.hashToken('alice-token-1'), 'alice', 2_000));
  await repository.insert(signal, new MagicLink('alice-token-2', MagicLink.hashToken('alice-token-2'), 'alice', 3_000));
  await repository.insert(signal, new MagicLink('bob-token', MagicLink.hashToken('bob-token'), 'bob', 2_000));

  await repository.deleteForUsers(signal, 'alice');

  const rows = db.prepare(`SELECT tokenHash FROM magic_links`).all() as unknown as Array<{ tokenHash: string }>;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].tokenHash, MagicLink.hashToken('bob-token'));
  db.close();
});

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Transaction } from '../../core/transaction';
import { SqliteUserRepository } from '../user/sqlite-user-repository';
import { User } from '../user/user';
import { SqliteUserChannelRepository } from './sqlite-user-channel-repository';
import { UserChannel } from './user-channel';

test('creates a default channel for users that exist during the version 1 upgrade', async () => {
  const db = createDatabase();
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(dbs);
  const repository = new SqliteUserChannelRepository(dbs);
  await userRepository.setup(signal);
  await userRepository.insert(signal, createUser('alice'));

  await repository.setup(signal);
  assert.deepEqual(await repository.getAll(signal, 'alice'), [new UserChannel('alice', 'default', '', true)]);

  await userRepository.insert(signal, createUser('bob'));
  await repository.setup(signal);
  assert.deepEqual(await repository.getAll(signal, 'bob'), []);

  db.close();
});

test('upserts, lists and deletes channels for one user', async () => {
  const { db, repository, signal } = await setup();

  await repository.upsert(signal, new UserChannel('alice', 'support', 'Support prompt', false));
  await repository.upsert(signal, new UserChannel('alice', 'sales', 'Sales prompt', true));
  await repository.upsert(signal, new UserChannel('bob', 'support', 'Bob support prompt', false));

  assert.deepEqual(await repository.get(signal, 'alice'), new UserChannel('alice', 'sales', 'Sales prompt', true));
  assert.deepEqual(await repository.tryGet(signal, 'alice', 'support'), new UserChannel('alice', 'support', 'Support prompt', false));
  assert.equal(await repository.tryGet(signal, 'alice', 'missing'), null);
  assert.deepEqual(await repository.getAll(signal, 'alice'), [
    new UserChannel('alice', 'sales', 'Sales prompt', true),
    new UserChannel('alice', 'default', '', false),
    new UserChannel('alice', 'support', 'Support prompt', false)
  ]);

  await repository.delete(signal, 'alice', 'support');
  assert.equal(
    (await repository.getAll(signal, 'alice')).some(channel => channel.name === 'support'),
    false
  );
  assert.equal(
    (await repository.getAll(signal, 'bob')).some(channel => channel.name === 'support'),
    true
  );

  db.close();
});

test('rolls back channel changes in an external transaction', async () => {
  const { db, repository, signal } = await setup();
  const transaction = Transaction.begin();

  await repository.delete(signal, 'alice', 'default', transaction);
  await repository.upsert(signal, new UserChannel('alice', 'support', 'Support prompt', true), transaction);
  await transaction.rollback();

  assert.deepEqual(await repository.getAll(signal, 'alice'), [new UserChannel('alice', 'default', '', true)]);
  db.close();
});

async function setup() {
  const db = createDatabase();
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(dbs);
  const repository = new SqliteUserChannelRepository(dbs);
  await userRepository.setup(signal);
  await userRepository.insert(signal, createUser('alice'));
  await userRepository.insert(signal, createUser('bob'));
  await repository.setup(signal);
  return { db, repository, signal };
}

function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  return db;
}

function createUser(name: string): User {
  return new User(name, null, 'hash', true, false);
}

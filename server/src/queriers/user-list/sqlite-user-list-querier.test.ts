import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { SqliteUserListQuerier } from './sqlite-user-list-querier';

test('queries name-ordered pages of users with optional active and contains filters', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteUserRepository(dbs);
  const querier = new SqliteUserListQuerier(dbs);

  await repository.setup(signal);
  await repository.insert(signal, new User('charlie', null, 'hash', true, false));
  await repository.insert(signal, new User('alice', null, 'hash', true, true));
  await repository.insert(signal, new User('alicia', null, 'hash', false, false));
  await repository.insert(signal, new User('bob', 'support@example.com', 'hash', true, false));

  assert.deepEqual(await querier.query(signal, 2, 1, false, 'ali'), {
    users: [{ name: 'alicia', isActive: false, isAdmin: false }],
    totalCount: 2,
    page: 2,
    pageSize: 1
  });
  assert.deepEqual(await querier.query(signal, 2, 2, false), {
    users: [
      { name: 'bob', isActive: true, isAdmin: false },
      { name: 'charlie', isActive: true, isAdmin: false }
    ],
    totalCount: 4,
    page: 2,
    pageSize: 2
  });
  assert.deepEqual(await querier.query(signal, 1, 2, true), {
    users: [
      { name: 'alice', isActive: true, isAdmin: true },
      { name: 'bob', isActive: true, isAdmin: false }
    ],
    totalCount: 3,
    page: 1,
    pageSize: 2
  });
  assert.deepEqual(await querier.query(signal, 1, 10, false, 'support'), {
    users: [{ name: 'bob', isActive: true, isAdmin: false }],
    totalCount: 1,
    page: 1,
    pageSize: 10
  });

  db.close();
});

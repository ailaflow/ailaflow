import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { SqliteUserListQuerier } from './sqlite-user-list-querier';

test('queries name-ordered pages of users with an optional contains search', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteUserRepository(dbs);
  const querier = new SqliteUserListQuerier(dbs);

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, new User('charlie', 'hash', false));
  await repository.insert(abortSignal, new User('alice', 'hash', true));
  await repository.insert(abortSignal, new User('alicia', 'hash', false));
  await repository.insert(abortSignal, new User('bob', 'hash', false));

  assert.deepEqual(await querier.query(abortSignal, 2, 1, 'ali'), {
    users: [{ name: 'alicia', isAdmin: false }],
    totalCount: 2,
    page: 2,
    pageSize: 1
  });
  assert.deepEqual(await querier.query(abortSignal, 2, 2), {
    users: [
      { name: 'bob', isAdmin: false },
      { name: 'charlie', isAdmin: false }
    ],
    totalCount: 4,
    page: 2,
    pageSize: 2
  });

  db.close();
});

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { UserAccessExpressionParser } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { UserAttributes } from '../../repositories/user-attributes/user-attributes';
import { SqliteUserAttributesRepository } from '../../repositories/user-attributes/sqlite-user-attributes-repository';
import { User } from '../../repositories/user/user';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { SqliteUserAccessExpressionUserQuerier } from './sqlite-user-access-expression-user-querier';

test('queries user names matching a user access expression', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;

  const userRepository = new SqliteUserRepository(dbs);
  const userAttributesRepository = new SqliteUserAttributesRepository(dbs);
  const querier = new SqliteUserAccessExpressionUserQuerier(dbs);

  await userRepository.setup(signal);
  await userAttributesRepository.setup(signal);

  await insertUser(signal, userRepository, userAttributesRepository, 'alice', {
    active: false,
    age: 10
  });
  await insertUser(signal, userRepository, userAttributesRepository, 'bob', {
    active: true,
    age: 20
  });
  await insertUser(signal, userRepository, userAttributesRepository, 'carol', {
    active: true,
    age: 17
  });

  assert.deepEqual(await querier.queryUserNames(signal, UserAccessExpressionParser.parse('@alice or @{.active = true and .age >= 18}')), [
    'alice',
    'bob'
  ]);
  assert.deepEqual(await querier.queryUserNames(signal, UserAccessExpressionParser.parse('')), ['alice', 'bob', 'carol']);
  assert.deepEqual(await querier.queryUserNames(signal, UserAccessExpressionParser.parse('@unknown')), []);

  db.close();
});

async function insertUser(
  signal: AbortSignal,
  userRepository: SqliteUserRepository,
  userAttributesRepository: SqliteUserAttributesRepository,
  name: string,
  attributes: Record<string, string | number | boolean>
): Promise<void> {
  const user = new User(name, null, 'hash', true, false);
  await userRepository.insert(signal, user);
  await userAttributesRepository.replace(signal, UserAttributes.create(user, attributes));
}

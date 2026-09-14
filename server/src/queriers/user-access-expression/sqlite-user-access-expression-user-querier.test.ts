import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { UserAccessExpressionParser } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { UserAttributes } from '../../repositories/user-attributes/user-attributes';
import { SqliteUserAttributesRepository } from '../../repositories/user-attributes/sqlite-user-attributes-repository';
import { User } from '../../repositories/user/user';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { SqliteUserAccessExpressionUserQuerier } from './sqlite-user-access-expression-user-querier';

test('queries user names matching a user access expression', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;

  const userRepository = new SqliteUserRepository(dbs);
  const userAttributesRepository = new SqliteUserAttributesRepository(dbs);
  const querier = new SqliteUserAccessExpressionUserQuerier(dbs);

  await userRepository.setup(abortSignal);
  await userAttributesRepository.setup(abortSignal);

  await insertUser(abortSignal, userRepository, userAttributesRepository, 'alice', {
    active: false,
    age: 10
  });
  await insertUser(abortSignal, userRepository, userAttributesRepository, 'bob', {
    active: true,
    age: 20
  });
  await insertUser(abortSignal, userRepository, userAttributesRepository, 'carol', {
    active: true,
    age: 17
  });

  assert.deepEqual(
    await querier.queryUserNames(abortSignal, UserAccessExpressionParser.parse('@alice or @{.active = true and .age >= 18}')),
    ['alice', 'bob']
  );
  assert.deepEqual(await querier.queryUserNames(abortSignal, UserAccessExpressionParser.parse('')), ['alice', 'bob', 'carol']);
  assert.deepEqual(await querier.queryUserNames(abortSignal, UserAccessExpressionParser.parse('@unknown')), []);

  db.close();
});

async function insertUser(
  abortSignal: AbortSignal,
  userRepository: SqliteUserRepository,
  userAttributesRepository: SqliteUserAttributesRepository,
  name: string,
  attributes: Record<string, string | number | boolean>
): Promise<void> {
  const user = new User(name, 'hash', false);
  await userRepository.insert(abortSignal, user);
  await userAttributesRepository.replace(abortSignal, UserAttributes.create(user, attributes));
}

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ResourceAccess } from '../../repositories/resource-access-repository/resource-access-repository';
import { SqliteResourceAccessRepository } from '../../repositories/resource-access-repository/sqlite-resource-access-repository';
import { UserAttributes } from '../../repositories/user-attributes-repository/user-attributes';
import { SqliteUserAttributesRepository } from '../../repositories/user-attributes-repository/sqlite-user-attributes-repository';
import { User } from '../../repositories/user-repository/user';
import { SqliteUserRepository } from '../../repositories/user-repository/sqlite-user-repository';
import { SqliteResourceAccessUserQuerier } from './sqlite-resource-access-user-querier';

test('queries user names assigned to a resource by access rules', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;

  const userRepository = new SqliteUserRepository(dbs);
  const userAttributesRepository = new SqliteUserAttributesRepository(dbs);
  const resourceAccessRepository = new SqliteResourceAccessRepository(dbs);
  const querier = new SqliteResourceAccessUserQuerier(dbs);

  await userRepository.setup(abortSignal);
  await userAttributesRepository.setup(abortSignal);
  await resourceAccessRepository.setup(abortSignal);

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

  await resourceAccessRepository.replace(
    abortSignal,
    ResourceAccess.createFromAccessExpression('process:review', '@alice or @{.active = true and .age >= 18}')
  );
  await resourceAccessRepository.replace(abortSignal, ResourceAccess.createFromAccessExpression('process:any', ''));

  assert.deepEqual(await querier.queryAssignedUserNames(abortSignal, 'process:review'), ['alice', 'bob']);
  assert.deepEqual(await querier.queryAssignedUserNames(abortSignal, 'process:any'), ['alice', 'bob', 'carol']);
  assert.deepEqual(await querier.queryAssignedUserNames(abortSignal, 'process:unknown'), []);

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

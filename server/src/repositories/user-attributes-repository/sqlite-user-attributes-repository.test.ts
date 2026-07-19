import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { UserAttributesRepositoryError } from './user-attributes-repository';
import { SqliteUserAttributesRepository } from './sqlite-user-attributes-repository';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteUserRepository } from '../user-repository/sqlite-user-repository';
import { User } from '../user-repository/user';
import { UserAttributes } from './user-attributes';

test('user attributes keep one value type per attribute name across users', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { userDb: db } as SqliteDatabases;

  const userRepository = new SqliteUserRepository(dbs);
  await userRepository.setup();
  const user1 = new User('user_1', 'hash', false);
  const user2 = new User('user_2', 'hash', false);
  await userRepository.insert(user1);
  await userRepository.insert(user2);

  const repository = new SqliteUserAttributesRepository(dbs);
  await repository.setup(AbortSignal.abort());

  await repository.replace(UserAttributes.create(user1, { age: 10 }));
  await repository.replace(UserAttributes.create(user2, { age: 20 }));

  const attributes = await repository.get('user_1');
  assert.equal(attributes.attributes.$user_name, 'user_1');
  assert.deepEqual(attributes.getWithoutUserName(), { age: 10 });

  await assert.rejects(() => repository.replace(UserAttributes.create(user2, { age: '20' })), UserAttributesRepositoryError);

  db.close();
});

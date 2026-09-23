import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { Request } from 'express';
import { Cipher } from '../../core/cipher/cipher';
import { SeedCipherKeyStore } from '../../core/cipher/seed-cipher-key-store';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { EndpointError } from '../framework/endpoint-error';
import { ChangeMyPasswordEndpoint } from './change-my-password-endpoint';

test('changes the authenticated user password after verifying the current password', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const repository = new SqliteUserRepository({ modelDb: new SqliteDatabase(db) } as SqliteDatabases);
  const cipher = new TestCipher();
  const signal = new AbortController().signal;
  await repository.setup(signal);
  await repository.insert(signal, await User.create('alice', null, 'current-password', false, cipher));
  const endpoint = new ChangeMyPasswordEndpoint(repository, cipher);

  assert.equal(endpoint.path, '/api/my-configuration/password');
  assert.equal(endpoint.auth, true);
  assert.deepEqual(
    await endpoint.handle(
      createRequest('alice', {
        currentPassword: 'current-password',
        newPassword: 'new-password'
      })
    ),
    {}
  );

  const user = await repository.tryGetUser(signal, 'alice');
  assert.equal(await user?.comparePassword('current-password', cipher), false);
  assert.equal(await user?.comparePassword('new-password', cipher), true);
  db.close();
});

test('rejects an incorrect current password and an invalid new password', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const repository = new SqliteUserRepository({ modelDb: new SqliteDatabase(db) } as SqliteDatabases);
  const cipher = new TestCipher();
  const signal = new AbortController().signal;
  await repository.setup(signal);
  await repository.insert(signal, await User.create('alice', null, 'current-password', false, cipher));
  const endpoint = new ChangeMyPasswordEndpoint(repository, cipher);

  await assert.rejects(
    () => endpoint.handle(createRequest('alice', { currentPassword: 'wrong-password', newPassword: 'new-password' })),
    error => error instanceof EndpointError && error.status === 400 && error.message === 'Current password is incorrect'
  );
  await assert.rejects(
    () => endpoint.handle(createRequest('alice', { currentPassword: 'current-password', newPassword: 'short' })),
    error => error instanceof EndpointError && error.status === 400 && error.message === 'Password must be at least 6 characters long'
  );

  const user = await repository.tryGetUser(signal, 'alice');
  assert.equal(await user?.comparePassword('current-password', cipher), true);
  db.close();
});

function createRequest(userName: string, body: unknown): Request {
  return Object.assign(new EventEmitter(), {
    authToken: new AuthToken('token', userName, Date.now() + 60_000, false),
    body
  }) as unknown as Request;
}

class TestCipher extends Cipher {
  public constructor() {
    super(new SeedCipherKeyStore('change-my-password-endpoint-test'));
  }

  public async hashPassword(password: string): Promise<string> {
    return `hash:${password}`;
  }

  public async verifyPassword(password: string, encodedHash: string): Promise<boolean> {
    return encodedHash === `hash:${password}`;
  }
}

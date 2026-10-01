import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { Request } from 'express';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { SqliteUserChannelRepository } from '../../repositories/user-channel/sqlite-user-channel-repository';
import { UserChannel } from '../../repositories/user-channel/user-channel';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { EndpointError } from '../framework/endpoint-error';
import { DeleteMyChannelEndpoint } from './delete-my-channel-endpoint';
import { GetMyChannelsEndpoint } from './get-my-channels-endpoint';
import { SaveMyChannelEndpoint } from './save-my-channel-endpoint';

test('gets, creates and updates channels for the authenticated user', async () => {
  const { db, repository } = await setup();
  const getEndpoint = new GetMyChannelsEndpoint(repository);
  const saveEndpoint = new SaveMyChannelEndpoint(repository);

  assert.equal(getEndpoint.path, '/api/my-configuration/channels');
  assert.equal(saveEndpoint.path, '/api/my-configuration/channels');
  assert.deepEqual(await getEndpoint.handle(createRequest('alice')), {
    channels: [{ name: 'default', prompt: '', isDefault: true }]
  });

  assert.deepEqual(
    await saveEndpoint.handle(
      createRequest('alice', {
        name: 'support',
        prompt: 'Help with support requests.',
        isDefault: false,
        insert: true
      })
    ),
    {}
  );
  await saveEndpoint.handle(
    createRequest('alice', {
      name: 'support',
      prompt: 'Updated support instructions.',
      isDefault: true,
      insert: false
    })
  );

  assert.deepEqual(await getEndpoint.handle(createRequest('alice')), {
    channels: [
      { name: 'support', prompt: 'Updated support instructions.', isDefault: true },
      { name: 'default', prompt: '', isDefault: false }
    ]
  });
  assert.deepEqual(await getEndpoint.handle(createRequest('bob')), {
    channels: [{ name: 'default', prompt: '', isDefault: true }]
  });

  db.close();
});

test('validates item creation and immutable names', async () => {
  const { db, repository } = await setup();
  const endpoint = new SaveMyChannelEndpoint(repository);

  await assertBadRequest(endpoint.handle(createRequest('alice', { name: 'Invalid', prompt: '', isDefault: false, insert: true })));
  await assertBadRequest(endpoint.handle(createRequest('alice', { name: 'default', prompt: '', isDefault: false, insert: true })));
  await assertBadRequest(endpoint.handle(createRequest('alice', { name: 'default', prompt: '', isDefault: false, insert: false })));
  await assert.rejects(
    endpoint.handle(createRequest('alice', { name: 'renamed', prompt: '', isDefault: true, insert: false })),
    error => error instanceof EndpointError && error.status === 404 && error.message === 'Channel "renamed" not found'
  );

  assert.deepEqual(await repository.getAll(new AbortController().signal, 'alice'), [new UserChannel('alice', 'default', '', true)]);
  db.close();
});

test('deletes only non-default channels', async () => {
  const { db, repository } = await setup();
  const saveEndpoint = new SaveMyChannelEndpoint(repository);
  const deleteEndpoint = new DeleteMyChannelEndpoint(repository);
  await saveEndpoint.handle(createRequest('alice', { name: 'support', prompt: '', isDefault: false, insert: true }));

  assert.equal(deleteEndpoint.path, '/api/my-configuration/channels/:name');
  await assertBadRequest(deleteEndpoint.handle(createRequest('alice', undefined, { name: 'default' })));
  assert.deepEqual(await deleteEndpoint.handle(createRequest('alice', undefined, { name: 'support' })), {});
  assert.equal(await repository.tryGet(new AbortController().signal, 'alice', 'support'), null);

  db.close();
});

async function setup() {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(dbs);
  const repository = new SqliteUserChannelRepository(dbs);
  await userRepository.setup(signal);
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));
  await userRepository.insert(signal, new User('bob', null, 'hash', true, false));
  await repository.setup(signal);
  return { db, repository };
}

function createRequest(userName: string, body?: unknown, params: Record<string, string> = {}): Request {
  return Object.assign(new EventEmitter(), {
    authToken: new AuthToken('token', AuthToken.hashToken('token'), userName, Date.now() + 60_000, false),
    body,
    params
  }) as unknown as Request;
}

async function assertBadRequest(promise: Promise<unknown>): Promise<void> {
  await assert.rejects(promise, error => error instanceof EndpointError && error.status === 400);
}

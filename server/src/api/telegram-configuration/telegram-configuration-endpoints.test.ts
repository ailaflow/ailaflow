import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { Request } from 'express';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { EventBus } from '../../events/event-bus';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { SqliteTelegramConfigurationRepository } from '../../repositories/configuration/telegram/sqlite-telegram-configuration-repository';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { TelegramBotApiClient } from '../../telegram/telegram-bot-api-client';
import { TelegramConfigurationManager } from '../../telegram/telegram-configuration-manager';
import { EndpointError } from '../framework/endpoint-error';
import { DeleteMyTelegramBotEndpoint } from '../my-configuration/delete-my-telegram-bot-endpoint';
import { GetMyTelegramConfigurationEndpoint } from '../my-configuration/get-my-telegram-configuration-endpoint';
import { SaveMyTelegramBotEndpoint } from '../my-configuration/save-my-telegram-bot-endpoint';
import { DeleteUserTelegramBotEndpoint } from '../user/delete-user-telegram-bot-endpoint';
import { GetUserTelegramConfigurationEndpoint } from '../user/get-user-telegram-configuration-endpoint';
import { SaveUserTelegramBotEndpoint } from '../user/save-user-telegram-bot-endpoint';

test('self endpoints use the authenticated user and admin endpoints use the route user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const userRepository = new SqliteUserRepository(dbs);
  const repository = new SqliteTelegramConfigurationRepository(dbs);
  const manager = new TelegramConfigurationManager(repository, new FakeTelegramBotApiClient(), new EventBus());
  const signal = new AbortController().signal;
  await userRepository.setup(signal);
  await repository.setup(signal);
  await userRepository.insert(signal, new User('admin', null, 'hash', true, true));
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));

  const saveMy = new SaveMyTelegramBotEndpoint(manager);
  assert.equal(saveMy.path, '/api/my-configuration/telegram');
  await saveMy.handle(createRequest('alice', { body: { channelName: 'default', botToken: 'alice-token' } }));
  assert.equal((await repository.tryGet(signal, 'alice', 'default'))?.botToken, 'alice-token');

  const saveUser = new SaveUserTelegramBotEndpoint(userRepository, manager);
  assert.equal(saveUser.path, '/api/users/:userName/telegram');
  await saveUser.handle(
    createRequest('admin', {
      params: { userName: 'alice' },
      body: { channelName: 'default', botToken: 'admin-set-token' }
    })
  );
  assert.equal((await repository.tryGet(signal, 'alice', 'default'))?.botToken, 'admin-set-token');
  assert.equal(await repository.tryGet(signal, 'admin', 'default'), null);

  const getMy = new GetMyTelegramConfigurationEndpoint(manager);
  assert.equal(getMy.path, '/api/my-configuration/telegram');
  assert.equal((await getMy.handle(createRequest('alice'))).bots.length, 1);
  assert.equal((await getMy.handle(createRequest('admin'))).bots.length, 0);

  const getUser = new GetUserTelegramConfigurationEndpoint(userRepository, manager);
  assert.equal(getUser.path, '/api/users/:userName/telegram');
  assert.equal(getUser.admin, true);
  assert.equal((await getUser.handle(createRequest('admin', { params: { userName: 'alice' } }))).bots.length, 1);
  await assert.rejects(
    () => getUser.handle(createRequest('admin', { params: { userName: 'missing' } })),
    error => error instanceof EndpointError && error.status === 404 && error.message === 'User not found'
  );

  await assert.rejects(
    () => saveMy.handle(createRequest('admin', { body: { channelName: 'default' } })),
    error => error instanceof EndpointError && error.status === 400 && error.message === 'Bot token is required'
  );

  const deleteUser = new DeleteUserTelegramBotEndpoint(userRepository, manager);
  assert.equal(deleteUser.path, '/api/users/:userName/telegram/:channelName');
  assert.equal(deleteUser.admin, true);
  assert.deepEqual(await deleteUser.handle(createRequest('admin', { params: { userName: 'alice', channelName: 'default' } })), {
    channelName: 'default'
  });
  assert.equal((await getUser.handle(createRequest('admin', { params: { userName: 'alice' } }))).bots.length, 0);

  const deleteMy = new DeleteMyTelegramBotEndpoint(manager);
  assert.equal(deleteMy.path, '/api/my-configuration/telegram/:channelName');
  await assert.rejects(
    () => deleteMy.handle(createRequest('alice', { params: { channelName: 'default' } })),
    error => error instanceof EndpointError && error.status === 404
  );
  db.close();
});

function createRequest(authenticatedUserName: string, options: { body?: unknown; params?: Record<string, string> } = {}): Request {
  return Object.assign(new EventEmitter(), {
    authToken: new AuthToken(
      'token',
      AuthToken.hashToken('token'),
      authenticatedUserName,
      Date.now() + 60_000,
      authenticatedUserName === 'admin'
    ),
    body: options.body,
    params: options.params ?? {}
  }) as unknown as Request;
}

class FakeTelegramBotApiClient extends TelegramBotApiClient {
  public async getMe() {
    return { id: 123, username: 'aila_test_bot' };
  }

  public async getWebhookInfo() {
    return { url: '' };
  }
}

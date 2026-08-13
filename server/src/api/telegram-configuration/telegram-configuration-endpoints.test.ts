import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { Request } from 'express';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { SqliteTelegramConfigurationRepository } from '../../repositories/telegram-configuration/sqlite-telegram-configuration-repository';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { DeleteMyTelegramBotEndpoint } from './delete-my-telegram-bot-endpoint';
import { GetMyTelegramConfigurationEndpoint } from './get-my-telegram-configuration-endpoint';
import { SaveMyTelegramBotEndpoint } from './save-my-telegram-bot-endpoint';

test('manages the authenticated user Telegram configuration without exposing tokens', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: db } as SqliteDatabases;
  const userRepository = new SqliteUserRepository(dbs);
  const repository = new SqliteTelegramConfigurationRepository(dbs);
  const save = new SaveMyTelegramBotEndpoint(repository);
  const get = new GetMyTelegramConfigurationEndpoint(repository);
  const remove = new DeleteMyTelegramBotEndpoint(repository);
  const abortSignal = new AbortController().signal;
  await userRepository.setup(abortSignal);
  await repository.setup(abortSignal);
  await userRepository.insert(abortSignal, new User('alice', 'hash', false));
  await userRepository.insert(abortSignal, new User('bob', 'hash', false));

  assert.deepEqual(await save.handle(createRequest('alice', { body: { channelName: 'default', botToken: 'top-secret' } })), {});
  assert.deepEqual(await get.handle(createRequest('alice')), {
    bots: [{ channelName: 'default', hasBotToken: true }]
  });
  assert.equal('botToken' in (await get.handle(createRequest('alice'))).bots[0], false);
  assert.deepEqual(await get.handle(createRequest('bob')), { bots: [] });

  await save.handle(createRequest('alice', { body: { channelName: 'default' } }));
  assert.equal((await repository.tryGet(abortSignal, 'alice', 'default'))?.botToken, 'top-secret');

  await assert.rejects(() => save.handle(createRequest('bob', { body: { channelName: 'default' } })), /Bot token is required/);
  await assert.rejects(
    () => remove.handle(createRequest('bob', { params: { channelName: 'default' } })),
    /Telegram bot configuration not found/
  );
  assert.deepEqual(await remove.handle(createRequest('alice', { params: { channelName: 'default' } })), {
    channelName: 'default'
  });
  db.close();
});

function createRequest(userName: string, options: { body?: unknown; params?: Record<string, string> } = {}): Request {
  return Object.assign(new EventEmitter(), {
    authToken: new AuthToken('token', userName, Date.now() + 60_000, false),
    body: options.body,
    params: options.params ?? {}
  }) as unknown as Request;
}

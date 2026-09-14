import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { AsyncMutex } from '../../../core/async-mutex';
import { SqliteUserRepository } from '../../user/sqlite-user-repository';
import { User } from '../../user/user';
import { SqliteTelegramConfigurationRepository } from './sqlite-telegram-configuration-repository';
import { TelegramBotConfiguration } from './telegram-bot-configuration';

test('persists Telegram bot configurations per user and channel', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: db, modelDbMutex: new AsyncMutex() } as SqliteDatabases;
  const userRepository = new SqliteUserRepository(dbs);
  const repository = new SqliteTelegramConfigurationRepository(dbs);
  const abortSignal = new AbortController().signal;
  await userRepository.setup(abortSignal);
  await repository.setup(abortSignal);
  await userRepository.insert(abortSignal, new User('alice', 'hash', false));
  await userRepository.insert(abortSignal, new User('bob', 'hash', false));

  await repository.upsert(
    abortSignal,
    TelegramBotConfiguration.create('alice', 'default', 'alice-token', {
      botId: 'bot-1',
      botUserName: 'alice_bot',
      telegramChatId: 'chat-1',
      linkCode: 'link-1',
      lastUpdateId: 41
    })
  );
  await repository.upsert(abortSignal, TelegramBotConfiguration.create('bob', 'default', 'bob-token', { botId: 'bot-2' }));
  await repository.upsert(abortSignal, TelegramBotConfiguration.create('alice', 'support', 'support-token'));

  assert.deepEqual(
    (await repository.getForUser(abortSignal, 'alice')).map(item => [item.channelName, item.botToken]),
    [
      ['default', 'alice-token'],
      ['support', 'support-token']
    ]
  );
  assert.equal((await repository.tryGet(abortSignal, 'bob', 'default'))?.botToken, 'bob-token');
  assert.equal((await repository.tryGet(abortSignal, 'alice', 'default'))?.telegramChatId, 'chat-1');
  assert.equal((await repository.getAll(abortSignal)).length, 3);

  await repository.connectTelegramChat(abortSignal, 'alice', 'default', 'chat-2');
  await repository.updateLastUpdateId(abortSignal, 'alice', 'default', 42);
  assert.equal((await repository.tryGet(abortSignal, 'alice', 'default'))?.telegramChatId, 'chat-2');
  assert.equal((await repository.tryGet(abortSignal, 'alice', 'default'))?.linkCode, null);
  assert.equal((await repository.tryGet(abortSignal, 'alice', 'default'))?.lastUpdateId, 42);

  await assert.rejects(
    () => repository.upsert(abortSignal, TelegramBotConfiguration.create('bob', 'support', 'token', { botId: 'bot-1' })),
    /already configured/
  );

  await repository.upsert(abortSignal, TelegramBotConfiguration.create('alice', 'default', 'updated-token'));
  assert.equal((await repository.tryGet(abortSignal, 'alice', 'default'))?.botToken, 'updated-token');
  assert.equal(await repository.delete(abortSignal, 'bob', 'support'), false);
  assert.equal(await repository.delete(abortSignal, 'alice', 'default'), true);
  assert.equal(await repository.tryGet(abortSignal, 'alice', 'default'), null);
  db.close();
});

test('validates required Telegram bot configuration fields', () => {
  assert.throws(() => TelegramBotConfiguration.create('', 'default', 'token'), /User name is required/);
  assert.throws(() => TelegramBotConfiguration.create('alice', '', 'token'), /Channel name is required/);
  assert.throws(() => TelegramBotConfiguration.create('alice', 'default', ''), /Bot token is required/);
});

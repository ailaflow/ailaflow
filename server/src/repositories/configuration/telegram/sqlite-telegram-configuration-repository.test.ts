import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { DEFAULT_CHANNEL_NAME } from '@ailaflow/shared';
import { Cipher } from '../../../core/cipher/cipher';
import { SeedCipherKeyStore } from '../../../core/cipher/seed-cipher-key-store';
import { SqliteDatabase } from '../../../core/sqlite-database';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { SqliteUserRepository } from '../../user/sqlite-user-repository';
import { User } from '../../user/user';
import { SqliteTelegramConfigurationRepository } from './sqlite-telegram-configuration-repository';
import { TelegramBotConfiguration } from './telegram-bot-configuration';

test('persists Telegram bot configurations per user and channel', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const userRepository = new SqliteUserRepository(dbs);
  const repository = new SqliteTelegramConfigurationRepository(dbs, new Cipher(new SeedCipherKeyStore('telegram-repository-test')));
  const signal = new AbortController().signal;
  await userRepository.setup(signal);
  await repository.setup(signal);
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));
  await userRepository.insert(signal, new User('bob', null, 'hash', true, false));

  await repository.upsert(
    signal,
    TelegramBotConfiguration.create('alice', DEFAULT_CHANNEL_NAME, 'alice-token', {
      botId: 'bot-1',
      botUserName: 'alice_bot',
      telegramChatId: 'chat-1',
      linkCode: 'link-1',
      lastUpdateId: 41
    })
  );
  await repository.upsert(signal, TelegramBotConfiguration.create('bob', DEFAULT_CHANNEL_NAME, 'bob-token', { botId: 'bot-2' }));
  await repository.upsert(signal, TelegramBotConfiguration.create('alice', 'support', 'support-token'));

  assert.deepEqual(
    (await repository.getForUser(signal, 'alice')).map(item => [item.channelName, item.botToken]),
    [
      [DEFAULT_CHANNEL_NAME, 'alice-token'],
      ['support', 'support-token']
    ]
  );
  assert.equal((await repository.tryGet(signal, 'bob', DEFAULT_CHANNEL_NAME))?.botToken, 'bob-token');
  assert.equal((await repository.tryGet(signal, 'alice', DEFAULT_CHANNEL_NAME))?.telegramChatId, 'chat-1');
  assert.equal((await repository.getAll(signal)).length, 3);
  const storedConfiguration = db
    .prepare(`SELECT botToken, telegramChatId, linkCode FROM telegram_bot_configurations WHERE userName = ? AND channelName = ?`)
    .get('alice', DEFAULT_CHANNEL_NAME) as { botToken: string; telegramChatId: string; linkCode: string };
  assert.notEqual(storedConfiguration.botToken, 'alice-token');
  assert.equal(storedConfiguration.telegramChatId, 'chat-1');
  assert.notEqual(storedConfiguration.linkCode, 'link-1');

  await repository.connectTelegramChat(signal, 'alice', DEFAULT_CHANNEL_NAME, 'chat-2');
  await repository.updateLastUpdateId(signal, 'alice', DEFAULT_CHANNEL_NAME, 42);
  assert.equal((await repository.tryGet(signal, 'alice', DEFAULT_CHANNEL_NAME))?.telegramChatId, 'chat-2');
  assert.equal((await repository.tryGet(signal, 'alice', DEFAULT_CHANNEL_NAME))?.linkCode, null);
  assert.equal((await repository.tryGet(signal, 'alice', DEFAULT_CHANNEL_NAME))?.lastUpdateId, 42);

  await assert.rejects(
    () => repository.upsert(signal, TelegramBotConfiguration.create('bob', 'support', 'token', { botId: 'bot-1' })),
    /already configured/
  );

  await repository.upsert(signal, TelegramBotConfiguration.create('alice', DEFAULT_CHANNEL_NAME, 'updated-token'));
  assert.equal((await repository.tryGet(signal, 'alice', DEFAULT_CHANNEL_NAME))?.botToken, 'updated-token');
  assert.equal(await repository.delete(signal, 'bob', 'support'), false);
  assert.equal(await repository.delete(signal, 'alice', DEFAULT_CHANNEL_NAME), true);
  assert.equal(await repository.tryGet(signal, 'alice', DEFAULT_CHANNEL_NAME), null);
  db.close();
});

test('validates required Telegram bot configuration fields', () => {
  assert.throws(() => TelegramBotConfiguration.create('', DEFAULT_CHANNEL_NAME, 'token'), /User name is required/);
  assert.throws(() => TelegramBotConfiguration.create('alice', '', 'token'), /Channel name is required/);
  assert.throws(() => TelegramBotConfiguration.create('alice', DEFAULT_CHANNEL_NAME, ''), /Bot token is required/);
});

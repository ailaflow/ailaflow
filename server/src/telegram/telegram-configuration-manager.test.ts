import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { DEFAULT_CHANNEL_NAME } from '@ailaflow/shared';
import { Cipher } from '../core/cipher/cipher';
import { SeedCipherKeyStore } from '../core/cipher/seed-cipher-key-store';
import { SqliteDatabase } from '../core/sqlite-database';
import { SqliteDatabases } from '../core/sqlite-databases';
import { EventBus } from '../events/event-bus';
import { TelegramConfigurationChangedEvent } from '../events/telegram-configuration/telegram-configuration-changed-event';
import { EventHandler } from '../events/event-handler';
import { TelegramBotConfiguration } from '../repositories/configuration/telegram/telegram-bot-configuration';
import { SqliteTelegramConfigurationRepository } from '../repositories/configuration/telegram/sqlite-telegram-configuration-repository';
import { SqliteUserRepository } from '../repositories/user/sqlite-user-repository';
import { User } from '../repositories/user/user';
import { TelegramBotApiClient, TelegramBotApiError } from './telegram-bot-api-client';
import { TelegramConfigurationError, TelegramConfigurationErrorReason } from './telegram-configuration-error';
import { TelegramConfigurationManager } from './telegram-configuration-manager';

test('manages user Telegram configurations without exposing bot tokens', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const userRepository = new SqliteUserRepository(dbs);
  const repository = new SqliteTelegramConfigurationRepository(dbs, new Cipher(new SeedCipherKeyStore('telegram-manager-test')));
  const eventBus = new EventBus();
  const eventHandler = new RecordingTelegramConfigurationChangedEventHandler();
  eventBus.registerHandler(eventHandler);
  const manager = new TelegramConfigurationManager(repository, new FakeTelegramBotApiClient(), eventBus);
  const signal = new AbortController().signal;
  await userRepository.setup(signal);
  await repository.setup(signal);
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));
  await userRepository.insert(signal, new User('bob', null, 'hash', true, false));

  const saved = await manager.save(signal, 'alice', { channelName: DEFAULT_CHANNEL_NAME, botToken: 'top-secret' });
  assert.equal(saved.bot.botUserName, 'aila_test_bot');
  assert.equal(saved.bot.isConnected, false);
  assert.ok(saved.bot.linkCode);
  assert.equal('botToken' in saved.bot, false);

  const configuration = await manager.get(signal, 'alice');
  assert.equal(configuration.bots[0].botUserName, 'aila_test_bot');
  assert.equal(configuration.bots[0].isConnected, false);
  assert.equal('botToken' in configuration.bots[0], false);
  assert.deepEqual(await manager.get(signal, 'bob'), { bots: [] });

  await manager.save(signal, 'alice', { channelName: DEFAULT_CHANNEL_NAME });
  assert.equal((await repository.tryGet(signal, 'alice', DEFAULT_CHANNEL_NAME))?.botToken, 'top-secret');

  const existing = await repository.tryGet(signal, 'alice', DEFAULT_CHANNEL_NAME);
  assert.ok(existing);
  await repository.upsert(
    signal,
    TelegramBotConfiguration.create(existing.userName, existing.channelName, existing.botToken, {
      botId: existing.botId,
      botUserName: existing.botUserName,
      telegramChatId: 'chat-id',
      lastUpdateId: 42
    })
  );
  assert.equal((await manager.save(signal, 'alice', { channelName: DEFAULT_CHANNEL_NAME })).bot.isConnected, true);
  const reconnected = await manager.save(signal, 'alice', { channelName: DEFAULT_CHANNEL_NAME, reconnect: true });
  assert.equal(reconnected.bot.isConnected, false);
  assert.ok(reconnected.bot.linkCode);

  await assert.rejects(
    () => manager.save(signal, 'bob', { channelName: DEFAULT_CHANNEL_NAME }),
    error =>
      error instanceof TelegramConfigurationError &&
      error.reason === TelegramConfigurationErrorReason.INVALID_CONFIGURATION &&
      error.message === 'Bot token is required'
  );
  await assert.rejects(
    () => manager.delete(signal, 'bob', DEFAULT_CHANNEL_NAME),
    error => error instanceof TelegramConfigurationError && error.reason === TelegramConfigurationErrorReason.CONFIGURATION_NOT_FOUND
  );
  assert.deepEqual(await manager.delete(signal, 'alice', DEFAULT_CHANNEL_NAME), { channelName: DEFAULT_CHANNEL_NAME });

  assert.ok(eventHandler.events.some(event => event.userName === 'alice' && event.channelName === DEFAULT_CHANNEL_NAME));
  db.close();
});

test('rejects invalid Telegram bot identities and webhook configurations', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const userRepository = new SqliteUserRepository(dbs);
  const repository = new SqliteTelegramConfigurationRepository(dbs, new Cipher(new SeedCipherKeyStore('telegram-manager-invalid-test')));
  const eventBus = new EventBus();
  const signal = new AbortController().signal;
  await userRepository.setup(signal);
  await repository.setup(signal);
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));
  const invalidTokenManager = new TelegramConfigurationManager(
    repository,
    new FakeTelegramBotApiClient(new TelegramBotApiError('Not Found', 404, null)),
    eventBus
  );
  await assert.rejects(
    () => invalidTokenManager.save(signal, 'alice', { channelName: DEFAULT_CHANNEL_NAME, botToken: 'bad-token' }),
    error =>
      error instanceof TelegramConfigurationError &&
      error.reason === TelegramConfigurationErrorReason.CREDENTIALS_REJECTED &&
      error.message === 'Incorrect Telegram bot token'
  );

  const webhookManager = new TelegramConfigurationManager(repository, new FakeTelegramBotApiClient(null, 'https://example.test'), eventBus);
  await assert.rejects(
    () => webhookManager.save(signal, 'alice', { channelName: DEFAULT_CHANNEL_NAME, botToken: 'token' }),
    error =>
      error instanceof TelegramConfigurationError &&
      error.reason === TelegramConfigurationErrorReason.INVALID_CONFIGURATION &&
      error.message.includes('has a webhook configured')
  );
  db.close();
});

class RecordingTelegramConfigurationChangedEventHandler implements EventHandler<TelegramConfigurationChangedEvent> {
  public readonly name = TelegramConfigurationChangedEvent.name;
  public readonly events: TelegramConfigurationChangedEvent[] = [];

  public async handle(event: TelegramConfigurationChangedEvent): Promise<void> {
    this.events.push(event);
  }
}

class FakeTelegramBotApiClient extends TelegramBotApiClient {
  public constructor(
    private readonly getMeError: Error | null = null,
    private readonly webhookUrl = ''
  ) {
    super();
  }

  public async getMe() {
    if (this.getMeError) {
      throw this.getMeError;
    }
    return { id: 123, username: 'aila_test_bot' };
  }

  public async getWebhookInfo() {
    return { url: this.webhookUrl };
  }
}

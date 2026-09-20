import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { EventBus } from '../../events/event-bus';
import { TelegramConfigurationChangedEvent } from '../../events/telegram-configuration/telegram-configuration-changed-event';
import { EventHandler } from '../../events/event-handler';
import { TelegramBotConfiguration } from '../../repositories/configuration/telegram/telegram-bot-configuration';
import { SqliteTelegramConfigurationRepository } from '../../repositories/configuration/telegram/sqlite-telegram-configuration-repository';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { TelegramBotApiClient, TelegramBotApiError } from '../../telegram/telegram-bot-api-client';
import { EndpointError } from '../framework/endpoint-error';
import { TelegramConfigurationApi } from './telegram-configuration-api';

test('manages user Telegram configurations without exposing bot tokens', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const userRepository = new SqliteUserRepository(dbs);
  const repository = new SqliteTelegramConfigurationRepository(dbs);
  const eventBus = new EventBus();
  const eventHandler = new RecordingTelegramConfigurationChangedEventHandler();
  eventBus.registerHandler(eventHandler);
  const api = new TelegramConfigurationApi(repository, new FakeTelegramBotApiClient(), eventBus);
  const abortSignal = new AbortController().signal;
  await userRepository.setup(abortSignal);
  await repository.setup(abortSignal);
  await userRepository.insert(abortSignal, new User('alice', null, 'hash', true, false));
  await userRepository.insert(abortSignal, new User('bob', null, 'hash', true, false));

  const saved = await api.save(abortSignal, 'alice', { channelName: 'default', botToken: 'top-secret' });
  assert.equal(saved.bot.botUserName, 'aila_test_bot');
  assert.equal(saved.bot.isConnected, false);
  assert.ok(saved.bot.linkCode);
  assert.equal('botToken' in saved.bot, false);

  const configuration = await api.get(abortSignal, 'alice');
  assert.equal(configuration.bots[0].botUserName, 'aila_test_bot');
  assert.equal(configuration.bots[0].isConnected, false);
  assert.equal('botToken' in configuration.bots[0], false);
  assert.deepEqual(await api.get(abortSignal, 'bob'), { bots: [] });

  await api.save(abortSignal, 'alice', { channelName: 'default' });
  assert.equal((await repository.tryGet(abortSignal, 'alice', 'default'))?.botToken, 'top-secret');

  const existing = await repository.tryGet(abortSignal, 'alice', 'default');
  assert.ok(existing);
  await repository.upsert(
    abortSignal,
    TelegramBotConfiguration.create(existing.userName, existing.channelName, existing.botToken, {
      botId: existing.botId,
      botUserName: existing.botUserName,
      telegramChatId: 'chat-id',
      lastUpdateId: 42
    })
  );
  assert.equal((await api.save(abortSignal, 'alice', { channelName: 'default' })).bot.isConnected, true);
  const reconnected = await api.save(abortSignal, 'alice', { channelName: 'default', reconnect: true });
  assert.equal(reconnected.bot.isConnected, false);
  assert.ok(reconnected.bot.linkCode);

  await assert.rejects(
    () => api.save(abortSignal, 'bob', { channelName: 'default' }),
    error => error instanceof EndpointError && error.status === 400 && error.message === 'Bot token is required'
  );
  await assert.rejects(
    () => api.delete(abortSignal, 'bob', 'default'),
    error => error instanceof EndpointError && error.status === 404
  );
  assert.deepEqual(await api.delete(abortSignal, 'alice', 'default'), { channelName: 'default' });

  assert.ok(eventHandler.events.some(event => event.userName === 'alice' && event.channelName === 'default'));
  db.close();
});

test('rejects invalid Telegram bot identities and webhook configurations', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const userRepository = new SqliteUserRepository(dbs);
  const repository = new SqliteTelegramConfigurationRepository(dbs);
  const eventBus = new EventBus();
  const abortSignal = new AbortController().signal;
  await userRepository.setup(abortSignal);
  await repository.setup(abortSignal);
  await userRepository.insert(abortSignal, new User('alice', null, 'hash', true, false));
  const invalidTokenApi = new TelegramConfigurationApi(
    repository,
    new FakeTelegramBotApiClient(new TelegramBotApiError('Not Found', 404, null)),
    eventBus
  );
  await assert.rejects(
    () => invalidTokenApi.save(abortSignal, 'alice', { channelName: 'default', botToken: 'bad-token' }),
    /Incorrect Telegram bot token/
  );

  const webhookApi = new TelegramConfigurationApi(repository, new FakeTelegramBotApiClient(null, 'https://example.test'), eventBus);
  await assert.rejects(
    () => webhookApi.save(abortSignal, 'alice', { channelName: 'default', botToken: 'token' }),
    /has a webhook configured/
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

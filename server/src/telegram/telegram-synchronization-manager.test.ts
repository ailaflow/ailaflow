import assert from 'node:assert/strict';
import { SimpleEvent } from '@aibindkit/core';
import { ChatSession, ChatSessionUpdate } from '@aibindkit/llm';
import test from 'node:test';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { KvConfigurationManager } from '../configuration/kv/kv-configuration-manager';
import { FormLinkMessageGenerator } from '../magic-link/form-link-message-generator';
import { MagicLinkGenerator } from '../magic-link/magic-link-generator';
import { createMagicLinkRepositoryMock } from '../repositories/auth-token/magic-link-repository-mock';
import { KvConfiguration } from '../repositories/configuration/kv/kv-configuration';
import { TelegramBotConfiguration } from '../repositories/configuration/telegram/telegram-bot-configuration';
import { TelegramConfigurationRepository } from '../repositories/configuration/telegram/telegram-configuration-repository';
import { TelegramBotApiClient } from './telegram-bot-api-client';
import { TelegramSynchronizationManager } from './telegram-synchronization-manager';

test('starts, reloads, removes, and stops Telegram channel synchronizers', async () => {
  const repository = new FakeRepository();
  repository.configuration = createConfiguration('token-1');
  const client = new FakeClient();
  const manager = new TelegramSynchronizationManager(repository, client, createSessionProvider(), createFormLinkMessageGenerator());

  await manager.start(new AbortController().signal);
  assert.equal(client.pollSignals.length, 1);

  repository.configuration = null;
  await manager.reload(new AbortController().signal, 'alice', 'default');
  assert.equal(client.pollSignals[0].aborted, true);

  repository.configuration = createConfiguration('token-2');
  await manager.reload(new AbortController().signal, 'alice', 'default');
  assert.equal(client.pollSignals.length, 2);
  manager.stop();
  assert.equal(client.pollSignals[1].aborted, true);
});

class FakeClient extends TelegramBotApiClient {
  public readonly pollSignals: AbortSignal[] = [];

  public async getMe() {
    return { id: 1, username: 'aila_bot' };
  }
  public async getWebhookInfo() {
    return { url: '' };
  }
  public async getUpdates(signal: AbortSignal) {
    this.pollSignals.push(signal);
    await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }));
    return [];
  }
  public async sendMessage(): Promise<never> {
    throw new Error('Not implemented');
  }
  public async sendTyping(): Promise<void> {}
}

class FakeRepository implements TelegramConfigurationRepository {
  public configuration: TelegramBotConfiguration | null = null;

  public async setup(): Promise<void> {}
  public async getAll(): Promise<TelegramBotConfiguration[]> {
    return this.configuration ? [this.configuration] : [];
  }
  public async getForUser(): Promise<TelegramBotConfiguration[]> {
    return this.configuration ? [this.configuration] : [];
  }
  public async tryGet(): Promise<TelegramBotConfiguration | null> {
    return this.configuration;
  }
  public async upsert(): Promise<void> {}
  public async connectTelegramChat(): Promise<void> {}
  public async updateLastUpdateId(): Promise<void> {}
  public async delete(): Promise<boolean> {
    return false;
  }
}

function createSessionProvider(): UserChatSessionProvider {
  const session = {
    onMessageStarted: new SimpleEvent<ChatSessionUpdate>(),
    onMessageCompleted: new SimpleEvent<ChatSessionUpdate>(),
    onMessageFailed: new SimpleEvent<ChatSessionUpdate>(),
    onReset: new SimpleEvent<void>(),
    onDestroyed: new SimpleEvent<void>(),
    getAll: () => []
  } as unknown as ChatSession;
  return { get: async () => session } as unknown as UserChatSessionProvider;
}

function createFormLinkMessageGenerator(): FormLinkMessageGenerator {
  const manager = {
    get: async () => new KvConfiguration()
  } as unknown as KvConfigurationManager;
  const repository = createMagicLinkRepositoryMock();
  return new FormLinkMessageGenerator(new MagicLinkGenerator(manager, repository));
}

function createConfiguration(botToken: string): TelegramBotConfiguration {
  return TelegramBotConfiguration.create('alice', 'default', botToken, {
    botId: 'bot',
    botUserName: 'aila_bot',
    linkCode: 'link'
  });
}

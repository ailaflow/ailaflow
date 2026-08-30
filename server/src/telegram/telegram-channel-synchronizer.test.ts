import assert from 'node:assert/strict';
import { ChatMessage, ChatMessageType, SimpleEvent } from '@aibindkit/core';
import { ChatSession, ChatSessionUpdate } from '@aibindkit/llm';
import test from 'node:test';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { TelegramBotConfiguration } from '../repositories/configuration/telegram/telegram-bot-configuration';
import { TelegramConfigurationRepository } from '../repositories/configuration/telegram/telegram-configuration-repository';
import { TelegramChannelSynchronizer } from './telegram-channel-synchronizer';
import { TelegramBotApiClient, TelegramBotApiError, TelegramMessage, TelegramUpdate } from './telegram-bot-api-client';
import { TelegramMessageStatus, tryGetTelegramMessageMetadata } from './telegram-message-metadata';

test('replays eligible session messages, resumes chunks, and stores numeric sent metadata', async () => {
  const longAnswer = 'a'.repeat(8_001);
  const messages: ChatMessage[] = [
    {
      id: 1,
      type: ChatMessageType.USER,
      completedMessages: [{ message: { role: 'user', content: 'Hello from portal' } }]
    },
    {
      id: 2,
      type: ChatMessageType.USER,
      completedMessages: [{ message: { role: 'user', content: 'Hidden' }, metadata: { internal: true } }]
    },
    {
      id: 3,
      type: ChatMessageType.AI,
      completedMessages: [
        {
          message: { role: 'assistant', content: longAnswer },
          metadata: {
            telegram: {
              delivery: {
                status: TelegramMessageStatus.FAILED,
                updatedAt: 1,
                attemptCount: 1,
                telegramMessageIds: [7],
                nextChunkIndex: 1,
                lastError: 'temporary'
              }
            }
          }
        }
      ]
    },
    {
      id: 4,
      type: ChatMessageType.USER,
      completedMessages: [
        {
          message: { role: 'user', content: 'Hello from Telegram' },
          metadata: { telegram: { origin: { updateId: 5, chatId: '42', messageId: 6 } } }
        }
      ]
    }
  ];
  const session = new FakeChatSession(messages);
  const client = new FakeTelegramBotApiClient();
  const synchronizer = new TelegramChannelSynchronizer(
    TelegramBotConfiguration.create('alice', 'default', 'token', {
      botId: 'bot',
      botUserName: 'aila_bot',
      telegramChatId: '42',
      linkCode: 'link'
    }),
    new FakeTelegramConfigurationRepository(),
    client,
    createSessionProvider(session)
  );

  await synchronizer.start();
  await waitFor(() => client.sentTexts.length === 3);
  synchronizer.destroy();

  assert.equal(client.sentTexts[0], 'You in Aila: Hello from portal');
  assert.equal(client.sentTexts[1].length, 4_000);
  assert.equal(client.sentTexts[2].length, 1);
  assert.equal(client.sentTexts.includes('Hidden'), false);
  assert.equal(
    client.sentTexts.some(text => text.includes('Hello from Telegram')),
    false
  );
  const firstDelivery = tryGetTelegramMessageMetadata(messages[0].completedMessages![0].metadata)?.delivery;
  const resumedDelivery = tryGetTelegramMessageMetadata(messages[2].completedMessages![0].metadata)?.delivery;
  assert.equal(firstDelivery?.status, TelegramMessageStatus.SENT);
  assert.equal(resumedDelivery?.status, TelegramMessageStatus.SENT);
  assert.deepEqual(resumedDelivery?.telegramMessageIds, [7, 2, 3]);
  assert.equal(resumedDelivery?.nextChunkIndex, 3);
});

test('links a private Telegram chat and queues Telegram text with origin metadata', async () => {
  const session = new FakeChatSession([]);
  const repository = new FakeTelegramConfigurationRepository();
  const client = new FakeTelegramBotApiClient([
    {
      update_id: 10,
      message: { message_id: 20, chat: { id: 42, type: 'private' }, text: '/start link-code' }
    },
    {
      update_id: 11,
      message: { message_id: 21, chat: { id: 42, type: 'private' }, text: 'Hello Aila' }
    }
  ]);
  const synchronizer = new TelegramChannelSynchronizer(
    TelegramBotConfiguration.create('alice', 'default', 'token', {
      botId: 'bot',
      botUserName: 'aila_bot',
      linkCode: 'link-code'
    }),
    repository,
    client,
    createSessionProvider(session)
  );

  await synchronizer.start();
  await waitFor(() => session.queuedMessages.length === 1 && repository.lastUpdateId === 11);
  synchronizer.destroy();

  assert.equal(repository.telegramChatId, '42');
  assert.equal(client.sentTexts[0], 'Telegram is now connected to Aila.');
  assert.equal(session.queuedMessages[0].content, 'Hello Aila');
  assert.deepEqual(session.queuedMessages[0].metadata?.['telegram'], {
    origin: { updateId: 11, chatId: '42', messageId: 21 }
  });
});

test('reconnects polling after a transient Telegram failure', async () => {
  const session = new FakeChatSession([]);
  const repository = new FakeTelegramConfigurationRepository();
  const client = new FakeTelegramBotApiClient(
    [
      {
        update_id: 10,
        message: { message_id: 20, chat: { id: 42, type: 'private' }, text: 'After reconnect' }
      }
    ],
    1
  );
  const synchronizer = new TelegramChannelSynchronizer(
    TelegramBotConfiguration.create('alice', 'default', 'token', {
      botId: 'bot',
      botUserName: 'aila_bot',
      telegramChatId: '42'
    }),
    repository,
    client,
    createSessionProvider(session)
  );

  await synchronizer.start();
  await waitFor(() => session.queuedMessages.length === 1 && repository.lastUpdateId === 10);
  synchronizer.destroy();

  assert.ok(client.getUpdatesCallCount >= 2);
  assert.equal(session.queuedMessages[0].content, 'After reconnect');
});

test('starts once and cannot restart after being destroyed', async () => {
  const synchronizer = new TelegramChannelSynchronizer(
    TelegramBotConfiguration.create('alice', 'default', 'token', {
      botId: 'bot',
      botUserName: 'aila_bot'
    }),
    new FakeTelegramConfigurationRepository(),
    new FakeTelegramBotApiClient(),
    createSessionProvider(new FakeChatSession([]))
  );

  await synchronizer.start();
  await assert.rejects(() => synchronizer.start(), /already been started/);

  synchronizer.destroy();
  synchronizer.destroy();
  await assert.rejects(() => synchronizer.start(), /has been destroyed/);
});

class FakeChatSession {
  public readonly onMessageStarted = new SimpleEvent<ChatSessionUpdate>();
  public readonly onMessageCompleted = new SimpleEvent<ChatSessionUpdate>();
  public readonly onMessageFailed = new SimpleEvent<ChatSessionUpdate>();
  public readonly onReset = new SimpleEvent<void>();
  public readonly onDestroyed = new SimpleEvent<void>();
  public readonly queuedMessages: Array<{ content: string; metadata?: Record<string, unknown> }> = [];

  public constructor(private readonly messages: ChatMessage[]) {}

  public getAll(): ChatMessage[] {
    return this.messages;
  }

  public async setMetadata(id: number, completedMessageIndex: number, key: string, value: unknown): Promise<void> {
    const completed = this.messages.find(message => message.id === id)?.completedMessages?.[completedMessageIndex];
    if (!completed) {
      throw new Error('Message not found');
    }
    completed.metadata = { ...completed.metadata, [key]: value };
    this.onMessageCompleted.emit({ update: { id, completedMessages: [completed] } });
  }

  public queueUserMessage(content: string, metadata?: Record<string, unknown>): number {
    this.queuedMessages.push({ content, metadata });
    return this.queuedMessages.length;
  }

  public reset(): void {
    this.onReset.emit();
  }

  public tryInterrupt(): boolean {
    return true;
  }
}

class FakeTelegramBotApiClient extends TelegramBotApiClient {
  public readonly sentTexts: string[] = [];
  public getUpdatesCallCount = 0;
  private updatesReturned = false;

  public constructor(
    private readonly updates: TelegramUpdate[] = [],
    private failuresBeforeUpdates = 0
  ) {
    super();
  }

  public async getMe() {
    return { id: 1, username: 'aila_bot' };
  }

  public async getWebhookInfo() {
    return { url: '' };
  }

  public async getUpdates(abortSignal: AbortSignal): Promise<TelegramUpdate[]> {
    this.getUpdatesCallCount++;
    if (this.failuresBeforeUpdates > 0) {
      this.failuresBeforeUpdates--;
      throw new TelegramBotApiError('Temporary Telegram failure', 429, 0);
    }
    if (!this.updatesReturned) {
      this.updatesReturned = true;
      return this.updates;
    }
    await new Promise<void>(resolve => abortSignal.addEventListener('abort', () => resolve(), { once: true }));
    return [];
  }

  public async sendMessage(_: AbortSignal, __: string, chatId: string, text: string): Promise<TelegramMessage> {
    this.sentTexts.push(text);
    return { message_id: this.sentTexts.length, chat: { id: Number(chatId), type: 'private' }, text };
  }

  public async sendTyping(): Promise<void> {}
}

class FakeTelegramConfigurationRepository implements TelegramConfigurationRepository {
  public telegramChatId: string | null = null;
  public lastUpdateId: number | null = null;

  public async setup(): Promise<void> {}
  public async getAll(): Promise<TelegramBotConfiguration[]> {
    return [];
  }
  public async getForUser(): Promise<TelegramBotConfiguration[]> {
    return [];
  }
  public async tryGet(): Promise<TelegramBotConfiguration | null> {
    return null;
  }
  public async upsert(): Promise<void> {}
  public async connectTelegramChat(_: AbortSignal, __: string, ___: string, telegramChatId: string): Promise<void> {
    this.telegramChatId = telegramChatId;
  }
  public async updateLastUpdateId(_: AbortSignal, __: string, ___: string, lastUpdateId: number): Promise<void> {
    this.lastUpdateId = lastUpdateId;
  }
  public async delete(): Promise<boolean> {
    return false;
  }
}

function createSessionProvider(session: FakeChatSession): UserChatSessionProvider {
  return { get: async () => session as unknown as ChatSession } as unknown as UserChatSessionProvider;
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > 1_000) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

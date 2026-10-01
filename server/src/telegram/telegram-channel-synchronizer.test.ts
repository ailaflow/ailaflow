import assert from 'node:assert/strict';
import { ChatMessage, ChatMessageType, SimpleEvent } from '@aibindkit/core';
import { ChatSession, ChatSessionUpdate } from '@aibindkit/llm';
import { DEFAULT_CHANNEL_NAME } from '@ailaflow/shared';
import test from 'node:test';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { KvConfigurationManager } from '../configuration/kv/kv-configuration-manager';
import { FormLinkMessageGenerator } from '../magic-link/form-link-message-generator';
import { MagicLinkGenerator } from '../magic-link/magic-link-generator';
import { createMagicLinkRepositoryMock } from '../repositories/auth-token/magic-link-repository-mock';
import { KvConfiguration } from '../repositories/configuration/kv/kv-configuration';
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
      type: ChatMessageType.ASSISTANT,
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
    },
    {
      id: 5,
      type: ChatMessageType.COMPACT,
      completedMessages: [{ message: { role: 'user', content: 'Compacted state' } }]
    }
  ];
  const session = new FakeChatSession(messages);
  const client = new FakeTelegramBotApiClient();
  const synchronizer = new TelegramChannelSynchronizer(
    TelegramBotConfiguration.create('alice', DEFAULT_CHANNEL_NAME, 'token', {
      botId: 'bot',
      botUserName: 'aila_bot',
      telegramChatId: '42',
      linkCode: 'link'
    }),
    new FakeTelegramConfigurationRepository(),
    client,
    createSessionProvider(session),
    createFormLinkMessageGenerator()
  );

  await synchronizer.start();
  await waitFor(() => client.sentTexts.length === 4);
  synchronizer.destroy();

  assert.equal(client.sentTexts[0], 'You in AilaFlow: Hello from portal');
  assert.equal(client.sentTexts[1].length, 4_000);
  assert.equal(client.sentTexts[2].length, 1);
  assert.equal(client.sentTexts[3], 'Context compacted.');
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

test('sends links for task and process start form metadata', async () => {
  const messages: ChatMessage[] = [
    {
      id: 1,
      type: ChatMessageType.USER,
      completedMessages: [
        {
          message: { role: 'user', content: 'Internal task notification' },
          metadata: { internal: true, taskForm: { id: 'task-123' } }
        }
      ]
    },
    {
      id: 2,
      type: ChatMessageType.TOOL,
      completedMessages: [
        {
          message: { role: 'tool', tool_call_id: 'call-1', content: '{"success":true}' },
          metadata: { processStartForm: { name: 'employee-onboarding' } }
        }
      ]
    }
  ];
  const session = new FakeChatSession(messages);
  const client = new FakeTelegramBotApiClient();
  const synchronizer = new TelegramChannelSynchronizer(
    TelegramBotConfiguration.create('alice', DEFAULT_CHANNEL_NAME, 'token', {
      botId: 'bot',
      botUserName: 'aila_bot',
      telegramChatId: '42'
    }),
    new FakeTelegramConfigurationRepository(),
    client,
    createSessionProvider(session),
    createFormLinkMessageGenerator('https://aila.example')
  );

  await synchronizer.start();
  await waitFor(() => client.sentTexts.length === 2);
  synchronizer.destroy();

  assert.match(
    client.sentTexts[0],
    /^─── 💼 Task Form ────\nPlease click here: https:\/\/aila\.example\/magic-link\?t=%2Fmy-tasks%2Ftask-123%3Ffs%3D1#token=[\w-]{43}\nValid for 2 hours\.\n──────────────\n$/
  );
  assert.match(
    client.sentTexts[1],
    /^─── 💼 Start Form ────\nPlease click here: https:\/\/aila\.example\/magic-link\?t=%2Fmy-processes%2Femployee-onboarding%3Ffs%3D1#token=[\w-]{43}\nValid for 2 hours\.\n──────────────\n$/
  );
});

test('forwards form-link configuration errors', async () => {
  const messages: ChatMessage[] = [
    {
      id: 1,
      type: ChatMessageType.TOOL,
      completedMessages: [
        {
          message: { role: 'tool', tool_call_id: 'call-1', content: '{"success":true}' },
          metadata: { taskForm: { id: 'task-123' }, processStartForm: { name: 'employee-onboarding' } }
        }
      ]
    }
  ];
  const session = new FakeChatSession(messages);
  const client = new FakeTelegramBotApiClient();
  const synchronizer = new TelegramChannelSynchronizer(
    TelegramBotConfiguration.create('alice', DEFAULT_CHANNEL_NAME, 'token', {
      botId: 'bot',
      botUserName: 'aila_bot',
      telegramChatId: '42'
    }),
    new FakeTelegramConfigurationRepository(),
    client,
    createSessionProvider(session),
    createFormLinkMessageGenerator()
  );

  await synchronizer.start();
  await waitFor(() => client.sentTexts.length === 2);
  synchronizer.destroy();

  assert.deepEqual(client.sentTexts, [
    '─── 💼 Task Form ────\nThe public URL is not configured. Please notify your administrator.\n──────────────\n',
    '─── 💼 Start Form ────\nThe public URL is not configured. Please notify your administrator.\n──────────────\n'
  ]);
});

test('delivers failures and interruptions once and reports only successful compaction as completed', async () => {
  const messages: ChatMessage[] = [
    {
      id: 1,
      type: ChatMessageType.ASSISTANT,
      failReason: 'Tool call validation failed',
      completedMessages: [{ message: { role: 'user', content: 'Internal failure context' } }]
    },
    {
      id: 2,
      type: ChatMessageType.USER,
      failReason: 'User message failed',
      completedMessages: [
        {
          message: { role: 'user', content: 'Telegram input' },
          metadata: { telegram: { origin: { updateId: 10, chatId: '42', messageId: 20 } } }
        }
      ]
    },
    {
      id: 3,
      type: ChatMessageType.ASSISTANT,
      isInterrupted: true,
      completedMessages: [{ message: { role: 'user', content: 'Internal interruption context' } }]
    },
    {
      id: 4,
      type: ChatMessageType.COMPACT,
      failReason: 'Compaction failed',
      completedMessages: [{ message: { role: 'user', content: 'Internal failure context' } }]
    },
    {
      id: 5,
      type: ChatMessageType.COMPACT,
      completedMessages: [{ message: { role: 'user', content: 'Compacted state' } }]
    }
  ];
  const session = new FakeChatSession(messages);
  const client = new FakeTelegramBotApiClient();
  const synchronizer = new TelegramChannelSynchronizer(
    TelegramBotConfiguration.create('alice', DEFAULT_CHANNEL_NAME, 'token', {
      botId: 'bot',
      botUserName: 'aila_bot',
      telegramChatId: '42'
    }),
    new FakeTelegramConfigurationRepository(),
    client,
    createSessionProvider(session),
    createFormLinkMessageGenerator()
  );

  await synchronizer.start();
  await waitFor(() => client.sentTexts.length === 5);
  synchronizer.destroy();

  assert.deepEqual(client.sentTexts, [
    'Failed: Tool call validation failed',
    'Failed: User message failed',
    'Interrupted.',
    'Failed: Compaction failed',
    'Context compacted.'
  ]);
  for (const message of messages) {
    const delivery = tryGetTelegramMessageMetadata(message.completedMessages![0].metadata)?.delivery;
    assert.equal(delivery?.status, TelegramMessageStatus.SENT);
    assert.equal(delivery?.attemptCount, 1);
  }
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
    TelegramBotConfiguration.create('alice', DEFAULT_CHANNEL_NAME, 'token', {
      botId: 'bot',
      botUserName: 'aila_bot',
      linkCode: 'link-code'
    }),
    repository,
    client,
    createSessionProvider(session),
    createFormLinkMessageGenerator()
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

test('reports an interrupted response after receiving the stop command', async () => {
  const session = new FakeChatSession([{ id: 1, type: ChatMessageType.ASSISTANT }]);
  const repository = new FakeTelegramConfigurationRepository();
  const client = new FakeTelegramBotApiClient([
    {
      update_id: 10,
      message: { message_id: 20, chat: { id: 42, type: 'private' }, text: '/stop' }
    }
  ]);
  const synchronizer = new TelegramChannelSynchronizer(
    TelegramBotConfiguration.create('alice', DEFAULT_CHANNEL_NAME, 'token', {
      botId: 'bot',
      botUserName: 'aila_bot',
      telegramChatId: '42'
    }),
    repository,
    client,
    createSessionProvider(session),
    createFormLinkMessageGenerator()
  );

  await synchronizer.start();
  await waitFor(() => client.sentTexts.length === 1 && repository.lastUpdateId === 10);
  synchronizer.destroy();

  assert.deepEqual(client.sentTexts, ['Interrupted.']);
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
    TelegramBotConfiguration.create('alice', DEFAULT_CHANNEL_NAME, 'token', {
      botId: 'bot',
      botUserName: 'aila_bot',
      telegramChatId: '42'
    }),
    repository,
    client,
    createSessionProvider(session),
    createFormLinkMessageGenerator()
  );

  await synchronizer.start();
  await waitFor(() => session.queuedMessages.length === 1 && repository.lastUpdateId === 10);
  synchronizer.destroy();

  assert.ok(client.getUpdatesCallCount >= 2);
  assert.equal(session.queuedMessages[0].content, 'After reconnect');
});

test('starts once and cannot restart after being destroyed', async () => {
  const synchronizer = new TelegramChannelSynchronizer(
    TelegramBotConfiguration.create('alice', DEFAULT_CHANNEL_NAME, 'token', {
      botId: 'bot',
      botUserName: 'aila_bot'
    }),
    new FakeTelegramConfigurationRepository(),
    new FakeTelegramBotApiClient(),
    createSessionProvider(new FakeChatSession([])),
    createFormLinkMessageGenerator()
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

  public async setMetadata(
    _: AbortSignal,
    pointer: { id: number; completedMessageIndex: number },
    key: string,
    value: unknown
  ): Promise<void> {
    const completed = this.messages.find(message => message.id === pointer.id)?.completedMessages?.[pointer.completedMessageIndex];
    if (!completed) {
      throw new Error('Message not found');
    }
    completed.metadata = { ...completed.metadata, [key]: value };
    this.onMessageCompleted.emit({ update: { id: pointer.id, completedMessages: [completed] } });
  }

  public queueUserMessage(content: string, metadata?: Record<string, unknown>): number {
    this.queuedMessages.push({ content, metadata });
    return this.queuedMessages.length;
  }

  public reset(): void {
    this.onReset.emit();
  }

  public tryInterrupt(): boolean {
    let pendingMessage: ChatMessage | undefined;
    for (let index = this.messages.length - 1; index >= 0; index--) {
      if (!this.messages[index].completedMessages) {
        pendingMessage = this.messages[index];
        break;
      }
    }
    if (!pendingMessage) {
      return false;
    }
    pendingMessage.isInterrupted = true;
    pendingMessage.completedMessages = [
      {
        message: {
          role: 'user',
          content: 'The request to LLM server was interrupted by the user.'
        }
      }
    ];
    this.onMessageFailed.emit({
      isWorking: false,
      update: { id: pendingMessage.id, isInterrupted: true }
    });
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

  public async getUpdates(signal: AbortSignal): Promise<TelegramUpdate[]> {
    this.getUpdatesCallCount++;
    if (this.failuresBeforeUpdates > 0) {
      this.failuresBeforeUpdates--;
      throw new TelegramBotApiError('Temporary Telegram failure', 429, 0);
    }
    if (!this.updatesReturned) {
      this.updatesReturned = true;
      return this.updates;
    }
    await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }));
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

function createFormLinkMessageGenerator(publicUrl: string | null = null): FormLinkMessageGenerator {
  const manager = {
    get: async () => new KvConfiguration(publicUrl)
  } as unknown as KvConfigurationManager;
  const repository = createMagicLinkRepositoryMock();
  return new FormLinkMessageGenerator(new MagicLinkGenerator(manager, repository));
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

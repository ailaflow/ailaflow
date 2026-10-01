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
import { SlackUserMappingRepository } from '../repositories/configuration/slack/slack-user-mapping-repository';
import { SlackConfiguration, SlackMappingWelcomeStatus, SlackUserMapping } from '../repositories/configuration/slack/slack-types';
import { SlackBotApiClient, SlackPostedMessage } from './slack-bot-api-client';
import { SlackChannelSynchronizer } from './slack-channel-synchronizer';
import { SlackMessageStatus, tryGetSlackMessageMetadata } from './slack-message-metadata';

test('delivers a failed message regardless of its type or Slack origin', async () => {
  const messages: ChatMessage[] = [
    {
      id: 1,
      type: ChatMessageType.TOOL,
      failReason: 'Tool call validation failed',
      completedMessages: [
        {
          message: { role: 'tool', tool_call_id: 'call-1', content: 'Internal failure context' },
          metadata: {
            slack: {
              origin: {
                eventId: 'event-1',
                workspaceId: 'workspace-1',
                slackUserId: 'slack-user-1',
                channelId: 'dm-1',
                messageTs: '1.0',
                mappingGeneration: 1
              }
            }
          }
        }
      ]
    }
  ];
  const session = new FakeChatSession(messages);
  const client = new FakeSlackBotApiClient();
  const synchronizer = new SlackChannelSynchronizer(
    createConfiguration(),
    createMapping(),
    new FakeSlackUserMappingRepository(),
    client,
    createSessionProvider(session),
    createFormLinkMessageGenerator()
  );

  await synchronizer.start();
  await waitFor(() => client.sentTexts.length === 1);
  synchronizer.destroy();

  assert.deepEqual(client.sentTexts, ['Failed: Tool call validation failed']);
  const delivery = tryGetSlackMessageMetadata(messages[0].completedMessages![0].metadata)?.delivery;
  assert.equal(delivery?.status, SlackMessageStatus.SENT);
  assert.equal(delivery?.attemptCount, 1);
  assert.equal(delivery?.mappingGeneration, 1);
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
  const client = new FakeSlackBotApiClient();
  const synchronizer = new SlackChannelSynchronizer(
    createConfiguration(),
    createMapping(),
    new FakeSlackUserMappingRepository(),
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
  const client = new FakeSlackBotApiClient();
  const synchronizer = new SlackChannelSynchronizer(
    createConfiguration(),
    createMapping(),
    new FakeSlackUserMappingRepository(),
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

class FakeChatSession {
  public readonly onMessageCompleted = new SimpleEvent<ChatSessionUpdate>();
  public readonly onMessageFailed = new SimpleEvent<ChatSessionUpdate>();
  public readonly onReset = new SimpleEvent<void>();
  public readonly onDestroyed = new SimpleEvent<void>();

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
}

class FakeSlackBotApiClient extends SlackBotApiClient {
  public readonly sentTexts: string[] = [];

  public async postMessage(_: AbortSignal, __: string, channel: string, text: string): Promise<SlackPostedMessage> {
    this.sentTexts.push(text);
    return { channel, ts: String(this.sentTexts.length) };
  }
}

class FakeSlackUserMappingRepository implements SlackUserMappingRepository {
  public async setup(): Promise<void> {}
  public async getAll(): Promise<SlackUserMapping[]> {
    return [];
  }
  public async tryGetBySlackUser(): Promise<SlackUserMapping> {
    return createMapping();
  }
  public async tryGetByAilaUser(): Promise<SlackUserMapping | null> {
    return null;
  }
  public async applyChanges(): Promise<number> {
    return 0;
  }
  public async deleteAll(): Promise<void> {}
  public async initializeDeliveryCursor(): Promise<boolean> {
    return true;
  }
  public async updateDeliveryCursorAfterReset(): Promise<void> {}
  public async updateDmChannelId(): Promise<void> {}
  public async getWelcomeCandidates(): Promise<SlackUserMapping[]> {
    return [];
  }
  public async markWelcomeAttempt(): Promise<void> {}
  public async markWelcomeSent(): Promise<void> {}
  public async markWelcomeFailed(): Promise<void> {}
  public async getCounts(): Promise<{ mapped: number; failedWelcome: number }> {
    return { mapped: 0, failedWelcome: 0 };
  }
}

function createConfiguration(): SlackConfiguration {
  return {
    appToken: 'app-token',
    botToken: 'bot-token',
    appId: 'app-1',
    workspaceId: 'workspace-1',
    workspaceName: 'Workspace',
    botUserId: 'bot-1',
    mappingRevision: 1,
    configuredAt: 1,
    updatedAt: 1
  };
}

function createMapping(): SlackUserMapping {
  return {
    workspaceId: 'workspace-1',
    slackUserId: 'slack-user-1',
    userName: 'alice',
    channelName: DEFAULT_CHANNEL_NAME,
    generation: 1,
    deliveryStartMessageId: 0,
    dmChannelId: 'dm-1',
    welcomeStatus: SlackMappingWelcomeStatus.SENT,
    welcomeAttemptCount: 1,
    welcomeNextAttemptAt: null,
    welcomeSentAt: 1,
    welcomeLastError: null,
    createdAt: 1,
    updatedAt: 1
  };
}

function createSessionProvider(session: FakeChatSession): UserChatSessionProvider {
  return { get: async () => session as unknown as ChatSession } as unknown as UserChatSessionProvider;
}

function createFormLinkMessageGenerator(publicUrl: string | null = null): FormLinkMessageGenerator {
  const manager = {
    get: async () => new KvConfiguration(publicUrl)
  } as unknown as KvConfigurationManager;
  return new FormLinkMessageGenerator(new MagicLinkGenerator(manager, createMagicLinkRepositoryMock()));
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > 2_500) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { SlackConfigurationRepository } from '../repositories/configuration/slack/slack-configuration-repository';
import { SlackInboundEventRepository } from '../repositories/configuration/slack/slack-inbound-event-repository';
import { SlackUserDirectoryRepository } from '../repositories/configuration/slack/slack-user-directory-repository';
import { SlackUserMappingRepository } from '../repositories/configuration/slack/slack-user-mapping-repository';
import { SlackInboundEvent } from '../repositories/configuration/slack/slack-types';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { SlackBotApiClient } from './slack-bot-api-client';
import { SlackSocketClient, SlackSocketEvent } from './slack-socket-client';
import { SlackSynchronizationManager } from './slack-synchronization-manager';

test('does not start the Slack runtime without configuration', async () => {
  let configurationReads = 0;
  let welcomeReads = 0;
  const inbox = new FakeInbox();
  const socket = new FakeSocket();
  const manager = new SlackSynchronizationManager(
    {
      tryGet: async () => {
        configurationReads++;
        return null;
      }
    } as unknown as SlackConfigurationRepository,
    {} as SlackUserDirectoryRepository,
    {
      getWelcomeCandidates: async () => {
        welcomeReads++;
        return [];
      }
    } as unknown as SlackUserMappingRepository,
    inbox,
    new SlackBotApiClient('https://slack.invalid/api'),
    socket,
    {} as UserChatSessionProvider
  );

  manager.start();
  await waitFor(() => configurationReads > 0);
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(socket.handler, null);
  assert.equal(inbox.pendingReads, 0);
  assert.equal(welcomeReads, 0);
  await manager.stop();
});

test('persists relevant Socket Mode events before acknowledging and deduplicates retries', async () => {
  const inbox = new FakeInbox();
  const socket = new FakeSocket();
  const configuration = {
    appToken: 'app-secret',
    botToken: 'bot-secret',
    appId: 'A1',
    workspaceId: 'T1',
    workspaceName: 'Workspace',
    botUserId: 'U_BOT',
    mappingRevision: 0,
    configuredAt: 1,
    updatedAt: 1
  };
  const manager = new SlackSynchronizationManager(
    {
      tryGet: async () => configuration
    } as unknown as SlackConfigurationRepository,
    {
      tryGet: async () => null
    } as unknown as SlackUserDirectoryRepository,
    {
      getAll: async () => [],
      getWelcomeCandidates: async () => []
    } as unknown as SlackUserMappingRepository,
    inbox,
    new SlackBotApiClient('https://slack.invalid/api'),
    socket,
    {} as UserChatSessionProvider
  );
  manager.start();
  await waitFor(() => socket.handler !== null);

  let acknowledged = 0;
  const body = {
    type: 'event_callback',
    event_id: 'Ev1',
    team_id: 'T1',
    event: { type: 'message', channel_type: 'im', user: 'U1', channel: 'D1', ts: '1.0', text: 'Hello' }
  };
  await socket.emit({
    type: 'events_api',
    body,
    acknowledge: async () => {
      assert.equal(inbox.events.has('Ev1'), true);
      acknowledged++;
    }
  });
  await socket.emit({ type: 'events_api', body, acknowledge: async () => void acknowledged++ });
  await socket.emit({
    type: 'events_api',
    body: { ...body, event_id: 'Ev2', team_id: 'OTHER' },
    acknowledge: async () => void acknowledged++
  });

  assert.equal(inbox.events.size, 1);
  assert.equal(acknowledged, 3);
  assert.equal(manager.getHealth().isConnected, true);
  await manager.stop();
});

class FakeSocket implements SlackSocketClient {
  public handler: ((event: SlackSocketEvent) => Promise<void>) | null = null;

  public async start(
    _: string,
    handler: (event: SlackSocketEvent) => Promise<void>,
    __: AbortSignal,
    onConnectionChange?: (connected: boolean, error: string | null) => void
  ): Promise<void> {
    this.handler = handler;
    onConnectionChange?.(true, null);
  }

  public async stop(): Promise<void> {
    this.handler = null;
  }

  public async emit(event: SlackSocketEvent): Promise<void> {
    assert.ok(this.handler);
    await this.handler(event);
  }
}

class FakeInbox implements SlackInboundEventRepository {
  public readonly events = new Map<string, SlackInboundEvent>();
  public pendingReads = 0;

  public async setup(): Promise<void> {}

  public async tryInsert(_: AbortSignal, event: SlackInboundEvent): Promise<boolean> {
    if (this.events.has(event.eventId)) {
      return false;
    }
    this.events.set(event.eventId, event);
    return true;
  }

  public async getPending(): Promise<SlackInboundEvent[]> {
    this.pendingReads++;
    return [];
  }

  public async markProcessed(): Promise<void> {}

  public async markFailed(): Promise<void> {}

  public async deleteOldProcessed(): Promise<number> {
    return 0;
  }
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (predicate()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  throw new Error('Condition was not met');
}

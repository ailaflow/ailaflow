import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { Logger } from '../core/logger';
import { SlackConfigurationRepository } from '../repositories/configuration/slack/slack-configuration-repository';
import { SlackInboundEventRepository } from '../repositories/configuration/slack/slack-inbound-event-repository';
import { SlackUserDirectoryRepository } from '../repositories/configuration/slack/slack-user-directory-repository';
import { SlackUserMappingRepository } from '../repositories/configuration/slack/slack-user-mapping-repository';
import { SlackInboundEventStatus, SlackUserMapping } from '../repositories/configuration/slack/slack-types';
import { SlackBotApiClient } from './slack-bot-api-client';
import { SlackChannelSynchronizer } from './slack-channel-synchronizer';
import { SlackInboundMessageWorker } from './slack-inbound-message-worker';
import { SlackRuntimeHealthProvider } from './slack-runtime-health';
import { SlackSocketClient, SlackSocketEvent } from './slack-socket-client';
import { SlackWelcomeMessageQueue } from './slack-welcome-message-queue';
import { formatSlackError } from './slack-error';

interface SlackEventEnvelope {
  type?: unknown;
  event_id?: unknown;
  team_id?: unknown;
  event?: {
    type?: unknown;
    channel_type?: unknown;
    user?: unknown;
    channel?: unknown;
    ts?: unknown;
    text?: unknown;
    subtype?: unknown;
    bot_id?: unknown;
    app_id?: unknown;
  };
}

export class SlackSynchronizationManager implements SlackRuntimeHealthProvider {
  private readonly logger = new Logger(SlackSynchronizationManager.name);
  private readonly synchronizers = new Map<string, SlackChannelSynchronizer>();
  private worker: SlackInboundMessageWorker | null = null;
  private welcomeQueue: SlackWelcomeMessageQueue | null = null;
  private socketAbortController: AbortController | null = null;
  private stopped = false;
  private connected = false;
  private lastError: string | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private runtimeChain: Promise<void> = Promise.resolve();

  public constructor(
    private readonly configurationRepository: SlackConfigurationRepository,
    private readonly directoryRepository: SlackUserDirectoryRepository,
    private readonly mappingRepository: SlackUserMappingRepository,
    inboundEventRepository: SlackInboundEventRepository,
    private readonly client: SlackBotApiClient,
    private readonly socketClient: SlackSocketClient,
    userChatSessionProvider: UserChatSessionProvider
  ) {
    this.userChatSessionProvider = userChatSessionProvider;
    this.inboundEventRepository = inboundEventRepository;
  }

  private readonly userChatSessionProvider: UserChatSessionProvider;
  private readonly inboundEventRepository: SlackInboundEventRepository;

  public start(): void {
    this.stopped = false;
    this.reloadConfigurationSafely();
  }

  public reloadConfiguration(): Promise<void> {
    return this.enqueue(() => this.doReloadConfiguration());
  }

  public reloadMappings(): Promise<void> {
    return this.enqueue(() => this.doReloadMappings());
  }

  private async doReloadConfiguration(): Promise<void> {
    await this.stopSocketAndSynchronizers();
    if (this.stopped) {
      return;
    }
    const configuration = await this.configurationRepository.tryGet(AbortSignal.timeout(10_000));
    if (this.stopped) {
      return;
    }
    if (!configuration) {
      await this.stopWorkers();
      this.connected = false;
      this.lastError = null;
      return;
    }
    this.startWorkers();
    await this.doReloadMappings();
    this.socketAbortController = new AbortController();
    try {
      await this.socketClient.start(
        configuration.appToken,
        event => this.handleSocketEvent(event, configuration.workspaceId),
        this.socketAbortController.signal,
        (connected, error) => {
          if (!this.stopped) {
            this.connected = connected;
            this.lastError = error;
          }
        }
      );
      this.connected = true;
      this.lastError = null;
      this.reconnectAttempt = 0;
    } catch (error) {
      if (!this.stopped) {
        this.connected = false;
        this.lastError = formatSlackError(error);
        this.logger.error(`Slack Socket Mode connection failed: ${this.lastError}`);
        this.scheduleReconnect();
      }
    }
  }

  private async doReloadMappings(): Promise<void> {
    for (const synchronizer of this.synchronizers.values()) {
      synchronizer.destroy();
    }
    this.synchronizers.clear();
    if (this.stopped) {
      return;
    }
    const configuration = await this.configurationRepository.tryGet(AbortSignal.timeout(10_000));
    if (!configuration) {
      return;
    }
    const mappings = await this.mappingRepository.getAll(AbortSignal.timeout(10_000), configuration.workspaceId);
    for (const mapping of mappings) {
      const user = await this.directoryRepository.tryGet(AbortSignal.timeout(10_000), configuration.workspaceId, mapping.slackUserId);
      if (user && !user.isDeleted) {
        await this.startSynchronizer(configuration, mapping);
      }
    }
    this.welcomeQueue?.wake();
  }

  public getHealth(): { isOperational: boolean; isConnected: boolean; lastError: string | null } {
    return { isOperational: this.connected && !this.stopped, isConnected: this.connected, lastError: this.lastError };
  }

  public async stop(): Promise<void> {
    this.stopped = true;
    const workersStopped = this.stopWorkers();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.enqueue(() => this.stopSocketAndSynchronizers());
    await workersStopped;
  }

  private async startSynchronizer(configuration: Awaited<ReturnType<SlackConfigurationRepository['tryGet']>>, mapping: SlackUserMapping) {
    if (!configuration) {
      return;
    }
    const synchronizer = new SlackChannelSynchronizer(
      configuration,
      mapping,
      this.mappingRepository,
      this.client,
      this.userChatSessionProvider
    );
    this.synchronizers.set(createKey(mapping), synchronizer);
    try {
      await synchronizer.start();
    } catch (error) {
      synchronizer.destroy();
      this.synchronizers.delete(createKey(mapping));
      this.logger.error(`Failed to start Slack synchronizer for ${mapping.userName}/default: ${formatSlackError(error)}`);
    }
  }

  private async handleSocketEvent(socketEvent: SlackSocketEvent, workspaceId: string): Promise<void> {
    const envelope = socketEvent.body as SlackEventEnvelope;
    const event = envelope.event;
    const relevant =
      (socketEvent.type === 'events_api' || envelope.type === 'events_api') &&
      (envelope.type === 'event_callback' || envelope.type === 'events_api') &&
      typeof envelope.event_id === 'string' &&
      envelope.team_id === workspaceId &&
      event?.type === 'message' &&
      event.channel_type === 'im' &&
      typeof event.user === 'string' &&
      typeof event.channel === 'string' &&
      typeof event.ts === 'string' &&
      event.bot_id === undefined &&
      event.app_id === undefined &&
      event.subtype === undefined;
    if (!relevant || !event || typeof envelope.event_id !== 'string') {
      await socketEvent.acknowledge();
      return;
    }
    const inserted = await this.inboundEventRepository.tryInsert(AbortSignal.timeout(5_000), {
      eventId: envelope.event_id,
      workspaceId,
      slackUserId: event.user as string,
      slackChannelId: event.channel as string,
      slackMessageTs: event.ts as string,
      text: typeof event.text === 'string' ? event.text : null,
      status: SlackInboundEventStatus.PENDING,
      attemptCount: 0,
      nextAttemptAt: null,
      lastError: null,
      receivedAt: Date.now(),
      processedAt: null
    });
    await socketEvent.acknowledge();
    if (inserted) {
      this.worker?.wake();
    }
  }

  private startWorkers(): void {
    if (!this.worker) {
      this.worker = new SlackInboundMessageWorker(
        this.inboundEventRepository,
        this.configurationRepository,
        this.mappingRepository,
        this.directoryRepository,
        this.userChatSessionProvider,
        this.client
      );
      this.worker.start();
    }
    if (!this.welcomeQueue) {
      this.welcomeQueue = new SlackWelcomeMessageQueue(this.configurationRepository, this.mappingRepository, this.client);
      this.welcomeQueue.start();
    }
  }

  private async stopWorkers(): Promise<void> {
    const worker = this.worker;
    const welcomeQueue = this.welcomeQueue;
    this.worker = null;
    this.welcomeQueue = null;
    await Promise.all([worker?.stop(), welcomeQueue?.stop()]);
  }

  private async stopSocketAndSynchronizers(): Promise<void> {
    this.connected = false;
    this.socketAbortController?.abort();
    this.socketAbortController = null;
    await this.socketClient.stop();
    for (const synchronizer of this.synchronizers.values()) {
      synchronizer.destroy();
    }
    this.synchronizers.clear();
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) {
      return;
    }
    const base = Math.min(60_000, 1_000 * 2 ** Math.min(this.reconnectAttempt++, 6));
    const delay = Math.round(base * (0.8 + Math.random() * 0.4));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reloadConfigurationSafely();
    }, delay);
  }

  private reloadConfigurationSafely(): void {
    void this.reloadConfiguration().catch(error => {
      if (this.stopped) {
        return;
      }
      this.connected = false;
      this.lastError = formatSlackError(error);
      this.logger.error(`Slack runtime reload failed: ${this.lastError}`);
      this.scheduleReconnect();
    });
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    const next = this.runtimeChain.then(action, action);
    this.runtimeChain = next.catch(() => undefined);
    return next;
  }
}

function createKey(mapping: SlackUserMapping): string {
  return `${mapping.workspaceId}\0${mapping.slackUserId}`;
}

import { DEFAULT_CHANNEL_NAME } from '@ailaflow/shared';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { Logger } from '../core/logger';
import { SlackConfigurationRepository } from '../repositories/configuration/slack/slack-configuration-repository';
import { SlackInboundEventRepository } from '../repositories/configuration/slack/slack-inbound-event-repository';
import { SlackUserDirectoryRepository } from '../repositories/configuration/slack/slack-user-directory-repository';
import { SlackUserMappingRepository } from '../repositories/configuration/slack/slack-user-mapping-repository';
import { SlackInboundEvent } from '../repositories/configuration/slack/slack-types';
import { SlackBotApiClient } from './slack-bot-api-client';
import { SlackMessageMetadata } from './slack-message-metadata';
import { formatSlackError } from './slack-error';

export const SLACK_NOT_CONNECTED_MESSAGE = 'Your account is not connected. Contact your AilaFlow administrator.';
export const SLACK_TEXT_ONLY_MESSAGE = 'Only text messages are supported currently.';

export class SlackInboundMessageWorker {
  private readonly logger = new Logger(SlackInboundMessageWorker.name);
  private readonly abortController = new AbortController();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private lastCleanupAt = 0;
  private runPromise: Promise<void> | null = null;

  public constructor(
    private readonly eventRepository: SlackInboundEventRepository,
    private readonly configurationRepository: SlackConfigurationRepository,
    private readonly mappingRepository: SlackUserMappingRepository,
    private readonly directoryRepository: SlackUserDirectoryRepository,
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly client: SlackBotApiClient
  ) {}

  public start(): void {
    this.schedule(0);
  }

  public wake(): void {
    this.schedule(0);
  }

  public async stop(): Promise<void> {
    this.abortController.abort();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.runPromise;
  }

  private schedule(delayMs: number): void {
    if (this.abortController.signal.aborted || this.running) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      const promise = this.run();
      this.runPromise = promise;
      void promise.finally(() => {
        if (this.runPromise === promise) {
          this.runPromise = null;
        }
      });
    }, delayMs);
  }

  private async run(): Promise<void> {
    if (this.abortController.signal.aborted || this.running) {
      return;
    }
    this.timer = null;
    this.running = true;
    try {
      const events = await this.eventRepository.getPending(this.abortController.signal, Date.now(), 25);
      for (const event of events) {
        await this.processSafely(event);
      }
      if (Date.now() - this.lastCleanupAt >= 60 * 60 * 1_000) {
        await this.eventRepository.deleteOldProcessed(this.abortController.signal, Date.now() - 7 * 24 * 60 * 60 * 1_000);
        this.lastCleanupAt = Date.now();
      }
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        this.logger.error(`Slack inbound worker failed: ${formatSlackError(error)}`);
      }
    } finally {
      this.running = false;
      this.schedule(2_000);
    }
  }

  private async processSafely(event: SlackInboundEvent): Promise<void> {
    try {
      await this.process(event);
      await this.eventRepository.markProcessed(this.abortController.signal, event.eventId, Date.now());
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        const delay = Math.min(60_000, 1_000 * 2 ** Math.min(event.attemptCount, 6));
        await this.eventRepository.markFailed(this.abortController.signal, event.eventId, Date.now() + delay, formatSlackError(error));
      }
    }
  }

  private async process(event: SlackInboundEvent): Promise<void> {
    const configuration = await this.configurationRepository.tryGet(this.abortController.signal);
    if (!configuration || configuration.workspaceId !== event.workspaceId) {
      throw new Error('Slack configuration is unavailable');
    }
    const mapping = await this.mappingRepository.tryGetBySlackUser(this.abortController.signal, event.workspaceId, event.slackUserId);
    if (!mapping) {
      await this.client.postMessage(this.abortController.signal, configuration.botToken, event.slackChannelId, {
        text: SLACK_NOT_CONNECTED_MESSAGE
      });
      return;
    }
    const slackUser = await this.directoryRepository.tryGet(this.abortController.signal, event.workspaceId, event.slackUserId);
    if (!slackUser || slackUser.isDeleted) {
      return;
    }
    await this.mappingRepository.updateDmChannelId(this.abortController.signal, event.workspaceId, event.slackUserId, event.slackChannelId);
    const text = event.text?.trim();
    if (!text) {
      await this.client.postMessage(this.abortController.signal, configuration.botToken, event.slackChannelId, {
        text: SLACK_TEXT_ONLY_MESSAGE
      });
      return;
    }
    const session = await this.userChatSessionProvider.get(this.abortController.signal, false, mapping.userName, DEFAULT_CHANNEL_NAME);
    session.queueUserMessage(text, {
      slack: {
        origin: {
          eventId: event.eventId,
          workspaceId: event.workspaceId,
          slackUserId: event.slackUserId,
          channelId: event.slackChannelId,
          messageTs: event.slackMessageTs,
          mappingGeneration: mapping.generation
        }
      } satisfies SlackMessageMetadata
    });
  }
}

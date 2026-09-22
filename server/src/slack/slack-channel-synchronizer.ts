import { ChatMessage, ChatMessageType } from '@aibindkit/core';
import { ChatSession } from '@aibindkit/llm';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { abortableSleep } from '../core/abortable-sleep';
import { Logger } from '../core/logger';
import { SlackConfiguration } from '../repositories/configuration/slack/slack-types';
import { SlackUserMappingRepository } from '../repositories/configuration/slack/slack-user-mapping-repository';
import { SlackUserMapping } from '../repositories/configuration/slack/slack-types';
import { SlackBotApiClient, SlackBotApiError } from './slack-bot-api-client';
import { SlackMessageFormatter } from './slack-message-formatter';
import { SlackMessageDelivery, SlackMessageMetadata, SlackMessageStatus, tryGetSlackMessageMetadata } from './slack-message-metadata';
import { formatSlackError } from './slack-error';

const MESSAGE_PACING_MS = 1_000;

export class SlackChannelSynchronizer {
  private readonly logger: Logger;
  private readonly abortController = new AbortController();
  private session: ChatSession | null = null;
  private deliveryChain: Promise<void> = Promise.resolve();
  private isUpdatingMetadata = false;
  private deliveryStartMessageId: number | null;
  private lastPostAt = 0;

  public constructor(
    private readonly configuration: SlackConfiguration,
    private readonly mapping: SlackUserMapping,
    private readonly mappingRepository: SlackUserMappingRepository,
    private readonly client: SlackBotApiClient,
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly formatter: SlackMessageFormatter = new SlackMessageFormatter()
  ) {
    this.deliveryStartMessageId = mapping.deliveryStartMessageId;
    this.logger = new Logger(`${SlackChannelSynchronizer.name}:${mapping.userName}:default`);
  }

  public async start(): Promise<void> {
    if (this.abortController.signal.aborted) {
      throw new Error('Slack channel synchronizer has been destroyed');
    }
    await this.attachSession();
  }

  public destroy(): void {
    if (this.abortController.signal.aborted) {
      return;
    }
    this.abortController.abort();
    this.detachSession();
  }

  private async attachSession(): Promise<void> {
    if (this.abortController.signal.aborted) {
      return;
    }
    const session = await this.userChatSessionProvider.get(
      AbortSignal.any([AbortSignal.timeout(10_000), this.abortController.signal]),
      false,
      this.mapping.userName,
      'default'
    );
    this.detachSession();
    this.session = session;
    session.onMessageCompleted.subscribe(this.onMessageCompleted);
    session.onMessageFailed.subscribe(this.onMessageCompleted);
    session.onReset.subscribe(this.onReset);
    session.onDestroyed.subscribe(this.onDestroyed);
    await this.initializeDeliveryCursor(session);
    this.scheduleDelivery();
  }

  private detachSession(): void {
    if (!this.session) {
      return;
    }
    this.session.onMessageCompleted.unsubscribe(this.onMessageCompleted);
    this.session.onMessageFailed.unsubscribe(this.onMessageCompleted);
    this.session.onReset.unsubscribe(this.onReset);
    this.session.onDestroyed.unsubscribe(this.onDestroyed);
    this.session = null;
  }

  private readonly onMessageCompleted = (): void => {
    if (!this.isUpdatingMetadata) {
      this.scheduleDelivery();
    }
  };

  private readonly onReset = (): void => {
    this.deliveryStartMessageId = 0;
    void this.mappingRepository
      .updateDeliveryCursorAfterReset(
        this.abortController.signal,
        this.mapping.workspaceId,
        this.mapping.slackUserId,
        this.mapping.generation,
        0
      )
      .then(() => this.scheduleDelivery())
      .catch(error => this.logger.error(`Failed to update Slack reset cursor: ${formatSlackError(error)}`));
  };

  private readonly onDestroyed = (): void => {
    this.detachSession();
    setTimeout(() => void this.reattach(), 0);
  };

  private async reattach(): Promise<void> {
    try {
      await this.attachSession();
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        this.logger.error(`Failed to restore Slack chat session: ${formatSlackError(error)}`);
        setTimeout(() => void this.reattach(), 5_000);
      }
    }
  }

  private async initializeDeliveryCursor(session: ChatSession): Promise<void> {
    const maxMessageId = session.getAll().reduce((maximum, message) => Math.max(maximum, message.id), 0);
    if (this.deliveryStartMessageId === null) {
      const initialized = await this.mappingRepository.initializeDeliveryCursor(
        this.abortController.signal,
        this.mapping.workspaceId,
        this.mapping.slackUserId,
        this.mapping.generation,
        maxMessageId
      );
      if (!initialized) {
        const current = await this.mappingRepository.tryGetBySlackUser(
          this.abortController.signal,
          this.mapping.workspaceId,
          this.mapping.slackUserId
        );
        if (!current || current.generation !== this.mapping.generation || current.deliveryStartMessageId === null) {
          throw new Error('Could not initialize Slack delivery cursor');
        }
        this.deliveryStartMessageId = current.deliveryStartMessageId;
      } else {
        this.deliveryStartMessageId = maxMessageId;
      }
    }
    if (this.deliveryStartMessageId !== null && maxMessageId < this.deliveryStartMessageId) {
      await this.mappingRepository.updateDeliveryCursorAfterReset(
        this.abortController.signal,
        this.mapping.workspaceId,
        this.mapping.slackUserId,
        this.mapping.generation,
        maxMessageId
      );
      this.deliveryStartMessageId = maxMessageId;
    }
  }

  private scheduleDelivery(): void {
    this.deliveryChain = this.deliveryChain
      .then(() => this.deliverPendingMessages())
      .catch(error => {
        if (!this.abortController.signal.aborted) {
          this.logger.error(`Failed to synchronize Slack messages: ${formatSlackError(error)}`);
          setTimeout(() => this.scheduleDelivery(), getRetryDelay(error));
        }
      });
  }

  private async deliverPendingMessages(): Promise<void> {
    const session = this.session;
    const cursor = this.deliveryStartMessageId;
    if (!session || cursor === null || this.abortController.signal.aborted) {
      return;
    }
    const currentMapping = await this.mappingRepository.tryGetBySlackUser(
      this.abortController.signal,
      this.mapping.workspaceId,
      this.mapping.slackUserId
    );
    if (!currentMapping || currentMapping.generation !== this.mapping.generation || !currentMapping.dmChannelId) {
      if (currentMapping?.generation === this.mapping.generation && !this.abortController.signal.aborted) {
        setTimeout(() => this.scheduleDelivery(), 5_000);
      }
      return;
    }
    for (const message of session.getAll()) {
      const isOutcome = this.isMessageOutcome(message);
      if (
        message.id <= cursor ||
        (!isOutcome &&
          message.type !== ChatMessageType.USER &&
          message.type !== ChatMessageType.ASSISTANT &&
          message.type !== ChatMessageType.COMPACT)
      ) {
        continue;
      }
      const completedMessageCount = this.getCompletedMessageDeliveryCount(message);
      for (let index = 0; index < completedMessageCount; index++) {
        const completed = message.completedMessages![index];
        const chunks = this.formatter.format({ ...message, completedMessages: [completed] });
        const slack = tryGetSlackMessageMetadata(completed.metadata);
        if (
          chunks.length === 0 ||
          (slack?.origin && !isOutcome) ||
          (slack?.delivery?.status === SlackMessageStatus.SENT && slack.delivery.mappingGeneration === this.mapping.generation)
        ) {
          continue;
        }
        await this.deliverMessage(session, message.id, index, chunks, slack, currentMapping.dmChannelId);
      }
    }
  }

  private getCompletedMessageDeliveryCount(message: ChatMessage): number {
    const count = message.completedMessages?.length ?? 0;
    if (this.isMessageOutcome(message) || message.type === ChatMessageType.COMPACT) {
      return Math.min(count, 1);
    }
    return count;
  }

  private isMessageOutcome(message: ChatMessage): boolean {
    return message.failReason !== undefined || message.isInterrupted === true;
  }

  private async deliverMessage(
    session: ChatSession,
    messageId: number,
    completedMessageIndex: number,
    chunks: string[],
    slack: SlackMessageMetadata | null,
    channelId: string
  ): Promise<void> {
    const previous = slack?.delivery;
    let delivery: SlackMessageDelivery =
      previous?.mappingGeneration === this.mapping.generation
        ? previous
        : {
            status: SlackMessageStatus.SENDING,
            updatedAt: Date.now(),
            attemptCount: 0,
            slackMessageTimestamps: [],
            nextChunkIndex: 0,
            mappingGeneration: this.mapping.generation
          };
    delivery = {
      ...delivery,
      status: SlackMessageStatus.SENDING,
      updatedAt: Date.now(),
      attemptCount: delivery.attemptCount + 1,
      lastError: undefined
    };
    await this.setMetadata(session, messageId, completedMessageIndex, { ...slack, delivery });
    try {
      for (let index = delivery.nextChunkIndex; index < chunks.length; index++) {
        await this.pacePostMessage();
        const sent = await this.client.postMessage(
          AbortSignal.any([AbortSignal.timeout(10_000), this.abortController.signal]),
          this.configuration.botToken,
          channelId,
          chunks[index]
        );
        this.lastPostAt = Date.now();
        delivery = {
          ...delivery,
          updatedAt: Date.now(),
          slackMessageTimestamps: [...delivery.slackMessageTimestamps, sent.ts],
          nextChunkIndex: index + 1
        };
        await this.setMetadata(session, messageId, completedMessageIndex, { ...slack, delivery });
      }
      delivery = { ...delivery, status: SlackMessageStatus.SENT, updatedAt: Date.now() };
      await this.setMetadata(session, messageId, completedMessageIndex, { ...slack, delivery });
    } catch (error) {
      delivery = { ...delivery, status: SlackMessageStatus.FAILED, updatedAt: Date.now(), lastError: formatSlackError(error) };
      await this.setMetadata(session, messageId, completedMessageIndex, { ...slack, delivery });
      throw error;
    }
  }

  private async setMetadata(
    session: ChatSession,
    messageId: number,
    completedMessageIndex: number,
    slack: SlackMessageMetadata
  ): Promise<void> {
    this.isUpdatingMetadata = true;
    try {
      const signal = AbortSignal.timeout(3_000);
      await session.setMetadata(signal, { id: messageId, completedMessageIndex }, 'slack', slack);
    } finally {
      this.isUpdatingMetadata = false;
    }
  }

  private async pacePostMessage(): Promise<void> {
    const remaining = MESSAGE_PACING_MS - (Date.now() - this.lastPostAt);
    if (remaining > 0) {
      await abortableSleep(this.abortController.signal, remaining);
    }
  }
}

function getRetryDelay(error: unknown): number {
  if (error instanceof SlackBotApiError && error.retryAfterSeconds !== null) {
    return error.retryAfterSeconds * 1_000;
  }
  return 5_000;
}

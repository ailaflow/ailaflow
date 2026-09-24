import { ChatMessage, ChatMessageType } from '@aibindkit/core';
import { ChatSession, ChatSessionUpdate } from '@aibindkit/llm';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { Logger } from '../core/logger';
import { FormLinkMessageGenerator } from '../magic-link/form-link-message-generator';
import { TelegramBotConfiguration } from '../repositories/configuration/telegram/telegram-bot-configuration';
import { TelegramConfigurationRepository } from '../repositories/configuration/telegram/telegram-configuration-repository';
import { TelegramBotApiClient, TelegramBotApiError, TelegramUpdate } from './telegram-bot-api-client';
import { TelegramMessageFormatter } from './telegram-message-formatter';
import {
  TelegramMessageDelivery,
  TelegramMessageMetadata,
  TelegramMessageStatus,
  tryGetTelegramMessageMetadata
} from './telegram-message-metadata';

const POLL_TIMEOUT_SECONDS = 25;

export class TelegramChannelSynchronizer {
  private readonly logger: Logger;
  private readonly destroyAbortController = new AbortController();
  private started = false;
  private session: ChatSession | null = null;
  private telegramChatId: string | null;
  private linkCode: string | null;
  private lastUpdateId: number | null;
  private deliveryChain: Promise<void> = Promise.resolve();
  private isUpdatingMetadata = false;

  public constructor(
    private readonly configuration: TelegramBotConfiguration,
    private readonly repository: TelegramConfigurationRepository,
    private readonly client: TelegramBotApiClient,
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly formLinkMessageGenerator: FormLinkMessageGenerator,
    private readonly messageFormatter: TelegramMessageFormatter = new TelegramMessageFormatter()
  ) {
    this.telegramChatId = configuration.telegramChatId;
    this.linkCode = configuration.linkCode;
    this.lastUpdateId = configuration.lastUpdateId;
    this.logger = new Logger(`${TelegramChannelSynchronizer.name}:${configuration.userName}:${configuration.channelName}`);
  }

  public async start(): Promise<void> {
    if (this.destroyAbortController.signal.aborted) {
      throw new Error('Telegram channel synchronizer has been destroyed');
    }
    if (this.started) {
      throw new Error('Telegram channel synchronizer has already been started');
    }
    this.started = true;
    await this.attachSession();
    void this.poll();
  }

  public destroy() {
    if (this.destroyAbortController.signal.aborted) {
      return;
    }
    this.destroyAbortController.abort('Telegram channel synchronizer destroyed');
    this.detachSession();
  }

  private async attachSession(): Promise<void> {
    if (this.destroyAbortController.signal.aborted) {
      return;
    }
    const isTest = false;
    const session = await this.userChatSessionProvider.get(
      AbortSignal.any([AbortSignal.timeout(10_000), this.destroyAbortController.signal]),
      isTest,
      this.configuration.userName,
      this.configuration.channelName
    );
    this.detachSession();
    this.session = session;
    session.onMessageStarted.subscribe(this.onMessageStarted);
    session.onMessageCompleted.subscribe(this.onMessageCompleted);
    session.onMessageFailed.subscribe(this.onMessageCompleted);
    session.onReset.subscribe(this.onReset);
    session.onDestroyed.subscribe(this.onDestroyed);
    this.scheduleDelivery();
  }

  private detachSession(): void {
    if (!this.session) {
      return;
    }
    this.session.onMessageStarted.unsubscribe(this.onMessageStarted);
    this.session.onMessageCompleted.unsubscribe(this.onMessageCompleted);
    this.session.onMessageFailed.unsubscribe(this.onMessageCompleted);
    this.session.onReset.unsubscribe(this.onReset);
    this.session.onDestroyed.unsubscribe(this.onDestroyed);
    this.session = null;
  }

  private readonly onMessageStarted = (update: ChatSessionUpdate): void => {
    if (!this.telegramChatId || update.update.type !== ChatMessageType.ASSISTANT) {
      return;
    }
    void this.client
      .sendTyping(AbortSignal.timeout(3_000), this.configuration.botToken, this.telegramChatId)
      .catch(error => this.logger.error(`Failed to send typing action: ${formatError(error)}`));
  };

  private readonly onMessageCompleted = (): void => {
    if (!this.isUpdatingMetadata) {
      this.scheduleDelivery();
    }
  };

  private readonly onReset = (): void => {
    if (this.telegramChatId) {
      void this.client
        .sendMessage(AbortSignal.timeout(10_000), this.configuration.botToken, this.telegramChatId, 'A new Aila conversation was started.')
        .catch(error => this.logger.error(`Failed to send reset message: ${formatError(error)}`));
    }
  };

  private readonly onDestroyed = (): void => {
    this.detachSession();
    setTimeout(() => void this.reattachSession(), 0);
  };

  private async reattachSession(): Promise<void> {
    try {
      await this.attachSession();
    } catch (error) {
      if (!this.destroyAbortController.signal.aborted) {
        this.logger.error(`Failed to restore chat session: ${formatError(error)}`);
        setTimeout(() => void this.reattachSession(), 5_000);
      }
    }
  }

  private async poll(): Promise<void> {
    let isReconnecting = false;
    while (!this.destroyAbortController.signal.aborted) {
      try {
        const updates = await this.client.getUpdates(
          this.destroyAbortController.signal,
          this.configuration.botToken,
          this.lastUpdateId === null ? null : this.lastUpdateId + 1,
          POLL_TIMEOUT_SECONDS
        );
        if (isReconnecting) {
          this.logger.log('Telegram polling reconnected');
          isReconnecting = false;
        }
        for (const update of updates) {
          await this.handleUpdate(update);
          this.lastUpdateId = update.update_id;
          await this.repository.updateLastUpdateId(
            this.destroyAbortController.signal,
            this.configuration.userName,
            this.configuration.channelName,
            update.update_id
          );
        }
      } catch (error) {
        if (this.destroyAbortController.signal.aborted) {
          return;
        }
        const retryDelay = getRetryDelay(error);
        isReconnecting = true;
        this.logger.error(`Telegram polling failed: ${formatError(error)}. Retrying in ${retryDelay / 1_000} seconds`);
        await delay(retryDelay, this.destroyAbortController.signal);
      }
    }
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    if (!message || message.chat.type !== 'private') {
      return;
    }
    const chatId = String(message.chat.id);
    const text = message.text?.trim();

    if (text?.startsWith('/start')) {
      const linkCode = text.split(/\s+/, 2)[1];
      if (linkCode && linkCode === this.linkCode && !this.telegramChatId) {
        await this.repository.connectTelegramChat(
          this.destroyAbortController.signal,
          this.configuration.userName,
          this.configuration.channelName,
          chatId
        );
        this.telegramChatId = chatId;
        this.linkCode = null;
        await this.client.sendMessage(
          AbortSignal.any([AbortSignal.timeout(10_000), this.destroyAbortController.signal]),
          this.configuration.botToken,
          chatId,
          'Telegram is now connected to Aila.'
        );
        this.scheduleDelivery();
      }
      return;
    }

    if (!this.telegramChatId || chatId !== this.telegramChatId) {
      return;
    }
    if (!text) {
      await this.client.sendMessage(
        AbortSignal.any([AbortSignal.timeout(10_000), this.destroyAbortController.signal]),
        this.configuration.botToken,
        chatId,
        'Only text messages are supported currently.'
      );
      return;
    }
    if (text === '/stop') {
      this.session?.tryInterrupt();
      return;
    }
    if (text === '/help') {
      await this.client.sendMessage(
        AbortSignal.any([AbortSignal.timeout(10_000), this.destroyAbortController.signal]),
        this.configuration.botToken,
        chatId,
        'Send a message to chat with Aila. Commands: /new starts a new conversation; /stop interrupts the current response.'
      );
      return;
    }

    this.session?.queueUserMessage(text, {
      telegram: {
        origin: {
          updateId: update.update_id,
          chatId,
          messageId: message.message_id
        }
      } satisfies TelegramMessageMetadata
    });
  }

  private scheduleDelivery(): void {
    this.deliveryChain = this.deliveryChain
      .then(() => this.deliverPendingMessages())
      .catch(error => {
        this.logger.error(`Failed to synchronize chat messages: ${formatError(error)}`);
        if (!this.destroyAbortController.signal.aborted) {
          setTimeout(() => this.scheduleDelivery(), getRetryDelay(error));
        }
      });
  }

  private async deliverPendingMessages(): Promise<void> {
    const session = this.session;
    const chatId = this.telegramChatId;
    if (!session || !chatId || this.destroyAbortController.signal.aborted) {
      return;
    }

    for (const message of session.getAll()) {
      const isOutcome = this.isMessageOutcome(message);
      const completedMessageCount = this.getCompletedMessageDeliveryCount(message);
      for (let completedMessageIndex = 0; completedMessageIndex < completedMessageCount; completedMessageIndex++) {
        const completedMessage = message.completedMessages![completedMessageIndex];
        const telegram = tryGetTelegramMessageMetadata(completedMessage.metadata);
        if (telegram?.delivery?.status === TelegramMessageStatus.SENT || (telegram?.origin && !isOutcome)) {
          continue;
        }
        const chunks = this.messageFormatter.format({ ...message, completedMessages: [completedMessage] });
        if (!isOutcome) {
          await this.formLinkMessageGenerator.tryAppend(
            chunks,
            AbortSignal.any([AbortSignal.timeout(10_000), this.destroyAbortController.signal]),
            this.configuration.userName,
            completedMessage.metadata
          );
        }
        if (chunks.length === 0) {
          continue;
        }
        await this.deliverMessage(session, message.id, completedMessageIndex, chunks, telegram, chatId);
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
    telegram: TelegramMessageMetadata | null,
    chatId: string
  ): Promise<void> {
    let delivery: TelegramMessageDelivery = telegram?.delivery ?? {
      status: TelegramMessageStatus.SENDING,
      updatedAt: Date.now(),
      attemptCount: 0,
      telegramMessageIds: [],
      nextChunkIndex: 0
    };
    delivery = {
      ...delivery,
      status: TelegramMessageStatus.SENDING,
      updatedAt: Date.now(),
      attemptCount: delivery.attemptCount + 1,
      lastError: undefined
    };
    await this.setTelegramMetadata(session, messageId, completedMessageIndex, { ...telegram, delivery });

    try {
      for (let index = delivery.nextChunkIndex; index < chunks.length; index++) {
        const sent = await this.client.sendMessage(
          AbortSignal.any([AbortSignal.timeout(10_000), this.destroyAbortController.signal]),
          this.configuration.botToken,
          chatId,
          chunks[index]
        );
        delivery = {
          ...delivery,
          updatedAt: Date.now(),
          telegramMessageIds: [...delivery.telegramMessageIds, sent.message_id],
          nextChunkIndex: index + 1
        };
        await this.setTelegramMetadata(session, messageId, completedMessageIndex, { ...telegram, delivery });
      }
      delivery = { ...delivery, status: TelegramMessageStatus.SENT, updatedAt: Date.now() };
      await this.setTelegramMetadata(session, messageId, completedMessageIndex, { ...telegram, delivery });
    } catch (error) {
      delivery = {
        ...delivery,
        status: TelegramMessageStatus.FAILED,
        updatedAt: Date.now(),
        lastError: formatError(error)
      };
      await this.setTelegramMetadata(session, messageId, completedMessageIndex, { ...telegram, delivery });
      throw error;
    }
  }

  private async setTelegramMetadata(
    session: ChatSession,
    messageId: number,
    completedMessageIndex: number,
    telegram: TelegramMessageMetadata
  ): Promise<void> {
    this.isUpdatingMetadata = true;
    try {
      const signal = AbortSignal.timeout(3_000);
      await session.setMetadata(signal, { id: messageId, completedMessageIndex }, 'telegram', telegram);
    } finally {
      this.isUpdatingMetadata = false;
    }
  }
}

function getRetryDelay(error: unknown): number {
  return error instanceof TelegramBotApiError && error.retryAfterSeconds !== null ? error.retryAfterSeconds * 1_000 : 5_000;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return;
  }
  await new Promise<void>(resolve => {
    const timeout = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
  });
}

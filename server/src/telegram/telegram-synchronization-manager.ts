import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { Logger } from '../core/logger';
import { FormLinkMessageGenerator } from '../magic-link/form-link-message-generator';
import { TelegramConfigurationRepository } from '../repositories/configuration/telegram/telegram-configuration-repository';
import { TelegramChannelSynchronizer } from './telegram-channel-synchronizer';
import { TelegramBotApiClient } from './telegram-bot-api-client';

export class TelegramSynchronizationManager {
  private readonly logger = new Logger(TelegramSynchronizationManager.name);
  private readonly synchronizers = new Map<string, TelegramChannelSynchronizer>();
  private stopped = false;

  public constructor(
    private readonly repository: TelegramConfigurationRepository,
    private readonly client: TelegramBotApiClient,
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly formLinkMessageGenerator: FormLinkMessageGenerator
  ) {}

  public async start(signal: AbortSignal): Promise<void> {
    const configurations = await this.repository.getAll(signal);
    await Promise.all(
      configurations.map(configuration => this.startSynchronizer(configuration.userName, configuration.channelName, signal))
    );
  }

  public async reload(signal: AbortSignal, userName: string, channelName: string): Promise<void> {
    const key = createSynchronizerKey(userName, channelName);
    const s = this.synchronizers.get(key);
    if (s) {
      s.destroy();
      this.synchronizers.delete(key);
    }
    await this.startSynchronizer(userName, channelName, signal);
  }

  public stop(): void {
    this.stopped = true;
    for (const synchronizer of this.synchronizers.values()) {
      synchronizer.destroy();
    }
    this.synchronizers.clear();
  }

  private async startSynchronizer(userName: string, channelName: string, signal: AbortSignal): Promise<void> {
    if (this.stopped) {
      return;
    }
    const configuration = await this.repository.tryGet(signal, userName, channelName);
    if (!configuration?.botId) {
      return;
    }
    const synchronizerKey = createSynchronizerKey(userName, channelName);
    const synchronizer = new TelegramChannelSynchronizer(
      configuration,
      this.repository,
      this.client,
      this.userChatSessionProvider,
      this.formLinkMessageGenerator
    );
    this.synchronizers.set(synchronizerKey, synchronizer);
    try {
      await synchronizer.start();
    } catch (error) {
      this.synchronizers.delete(synchronizerKey);
      synchronizer.destroy();
      this.logger.error(`Failed to start Telegram synchronizer for ${userName}/${channelName}: ${formatError(error)}`);
    }
  }
}

function createSynchronizerKey(userName: string, channelName: string): string {
  return `${userName}\0${channelName}`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

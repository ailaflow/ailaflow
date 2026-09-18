import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { PublicFormUrlGenerator } from '../configuration/public-url/public-form-url-generator';
import { Logger } from '../core/logger';
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
    private readonly publicFormUrlGenerator: PublicFormUrlGenerator
  ) {}

  public async start(abortSignal: AbortSignal): Promise<void> {
    const configurations = await this.repository.getAll(abortSignal);
    await Promise.all(
      configurations.map(configuration => this.startSynchronizer(configuration.userName, configuration.channelName, abortSignal))
    );
  }

  public async reload(abortSignal: AbortSignal, userName: string, channelName: string): Promise<void> {
    const key = createSynchronizerKey(userName, channelName);
    const s = this.synchronizers.get(key);
    if (s) {
      s.destroy();
      this.synchronizers.delete(key);
    }
    await this.startSynchronizer(userName, channelName, abortSignal);
  }

  public stop(): void {
    this.stopped = true;
    for (const synchronizer of this.synchronizers.values()) {
      synchronizer.destroy();
    }
    this.synchronizers.clear();
  }

  private async startSynchronizer(userName: string, channelName: string, abortSignal: AbortSignal): Promise<void> {
    if (this.stopped) {
      return;
    }
    const configuration = await this.repository.tryGet(abortSignal, userName, channelName);
    if (!configuration?.botId) {
      return;
    }
    const synchronizerKey = createSynchronizerKey(userName, channelName);
    const synchronizer = new TelegramChannelSynchronizer(
      configuration,
      this.repository,
      this.client,
      this.userChatSessionProvider,
      this.publicFormUrlGenerator
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

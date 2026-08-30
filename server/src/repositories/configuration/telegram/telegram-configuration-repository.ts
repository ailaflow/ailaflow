import { Repository } from '../../repository';
import { TelegramBotConfiguration } from './telegram-bot-configuration';

export class TelegramConfigurationRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = TelegramConfigurationRepositoryError.name;
  }
}

export interface TelegramConfigurationRepository extends Repository {
  getAll(abortSignal: AbortSignal): Promise<TelegramBotConfiguration[]>;
  getForUser(abortSignal: AbortSignal, userName: string): Promise<TelegramBotConfiguration[]>;
  tryGet(abortSignal: AbortSignal, userName: string, channelName: string): Promise<TelegramBotConfiguration | null>;
  upsert(abortSignal: AbortSignal, configuration: TelegramBotConfiguration): Promise<void>;
  connectTelegramChat(abortSignal: AbortSignal, userName: string, channelName: string, telegramChatId: string): Promise<void>;
  updateLastUpdateId(abortSignal: AbortSignal, userName: string, channelName: string, lastUpdateId: number): Promise<void>;
  delete(abortSignal: AbortSignal, userName: string, channelName: string): Promise<boolean>;
}

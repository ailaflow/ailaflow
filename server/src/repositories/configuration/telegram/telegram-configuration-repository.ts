import { Transaction } from '../../../core/transaction';
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
  upsert(abortSignal: AbortSignal, configuration: TelegramBotConfiguration, transaction?: Transaction): Promise<void>;
  connectTelegramChat(
    abortSignal: AbortSignal,
    userName: string,
    channelName: string,
    telegramChatId: string,
    transaction?: Transaction
  ): Promise<void>;
  updateLastUpdateId(
    abortSignal: AbortSignal,
    userName: string,
    channelName: string,
    lastUpdateId: number,
    transaction?: Transaction
  ): Promise<void>;
  delete(abortSignal: AbortSignal, userName: string, channelName: string, transaction?: Transaction): Promise<boolean>;
}

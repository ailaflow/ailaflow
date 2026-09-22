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
  getAll(signal: AbortSignal): Promise<TelegramBotConfiguration[]>;
  getForUser(signal: AbortSignal, userName: string): Promise<TelegramBotConfiguration[]>;
  tryGet(signal: AbortSignal, userName: string, channelName: string): Promise<TelegramBotConfiguration | null>;
  upsert(signal: AbortSignal, configuration: TelegramBotConfiguration, transaction?: Transaction): Promise<void>;
  connectTelegramChat(
    signal: AbortSignal,
    userName: string,
    channelName: string,
    telegramChatId: string,
    transaction?: Transaction
  ): Promise<void>;
  updateLastUpdateId(
    signal: AbortSignal,
    userName: string,
    channelName: string,
    lastUpdateId: number,
    transaction?: Transaction
  ): Promise<void>;
  delete(signal: AbortSignal, userName: string, channelName: string, transaction?: Transaction): Promise<boolean>;
}

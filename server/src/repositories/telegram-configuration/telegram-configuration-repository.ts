import { Repository } from '../repository';
import { TelegramBotConfiguration } from './telegram-bot-configuration';

export interface TelegramConfigurationRepository extends Repository {
  getForUser(abortSignal: AbortSignal, userName: string): Promise<TelegramBotConfiguration[]>;
  tryGet(abortSignal: AbortSignal, userName: string, channelName: string): Promise<TelegramBotConfiguration | null>;
  upsert(abortSignal: AbortSignal, configuration: TelegramBotConfiguration): Promise<void>;
  delete(abortSignal: AbortSignal, userName: string, channelName: string): Promise<boolean>;
}

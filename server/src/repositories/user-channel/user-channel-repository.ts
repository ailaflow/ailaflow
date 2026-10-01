import { Transaction } from '../../core/transaction';
import { Repository } from '../repository';
import { UserChannel } from './user-channel';

export class UserChannelRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = UserChannelRepositoryError.name;
  }
}

export interface UserChannelRepository extends Repository {
  upsert(signal: AbortSignal, channel: UserChannel, transaction?: Transaction): Promise<void>;
  delete(signal: AbortSignal, userName: string, channelName: string, transaction?: Transaction): Promise<void>;
  tryGet(signal: AbortSignal, userName: string, channelName: string): Promise<UserChannel | null>;
  getAll(signal: AbortSignal, userName: string): Promise<UserChannel[]>;
}

import { Transaction } from '../../core/transaction';
import { Repository } from '../repository';
import { Notification } from './notification';

export interface NotificationRepository extends Repository {
  insertMultiple(abortSignal: AbortSignal, notifications: Notification[], transaction?: Transaction): Promise<void>;
  delete(abortSignal: AbortSignal, userName: string, id: string, transaction?: Transaction): Promise<boolean>;
}

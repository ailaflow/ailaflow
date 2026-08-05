import { Repository } from '../repository';
import { Notification } from './notification';

export interface NotificationRepository extends Repository {
  insertMultiple(abortSignal: AbortSignal, notifications: Notification[]): Promise<void>;
}

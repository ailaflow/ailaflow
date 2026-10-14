import { ListenMyNotificationsUpdate } from '@ailaflow/shared';
import { Request, Response } from 'express';
import { SseResponse } from '../../core/sse-response';
import { NotificationListenerStore, NotificationListenerStoreListener } from '../../notification/notification-listener-store';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';

export class ListenMyNotificationEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-notifications/listen';
  public readonly auth = true;

  public constructor(private readonly notificationListenerStore: NotificationListenerStore) {}

  public async handle(req: Request, res: Response): Promise<void> {
    const { userName } = getAuthToken(req);
    const sseResponse = new SseResponse<ListenMyNotificationsUpdate>(res);

    const listener: NotificationListenerStoreListener = notification => {
      sseResponse.send({
        notification: {
          id: notification.id,
          message: notification.message,
          createdAt: notification.createdAt
        }
      });
    };

    this.notificationListenerStore.set(userName, listener);
    sseResponse.onClose(() => this.notificationListenerStore.delete(userName, listener));
  }
}

import { Notification } from '../repositories/notification/notification';

export type NotificationListenerStoreListener = (notification: Notification) => void;

export class NotificationListenerStore {
  public readonly listeners = new Map<string, Set<NotificationListenerStoreListener>>();

  public set(userName: string, listener: NotificationListenerStoreListener) {
    let listeners = this.listeners.get(userName);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(userName, listeners);
    }
    listeners.add(listener);
  }

  public delete(userName: string, listener: NotificationListenerStoreListener) {
    const listeners = this.listeners.get(userName);
    if (listeners && listeners.delete(listener) && listeners.size === 0) {
      this.listeners.delete(userName);
    }
  }

  public notify(userName: string, notification: Notification) {
    const listeners = this.listeners.get(userName);
    if (listeners) {
      for (const l of listeners) {
        l(notification);
      }
    }
  }
}

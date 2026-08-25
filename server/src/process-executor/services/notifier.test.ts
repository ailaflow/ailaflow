import assert from 'node:assert/strict';
import test from 'node:test';
import { ChatSession } from '@aibindkit/llm';
import { UserChatSessionProvider } from '../../chat-session/user-chat-session-provider';
import { UserAccessExpressionUserQuerier } from '../../queriers/user-access-expression/user-access-expression-user-querier';
import { Notification } from '../../repositories/notification/notification';
import { NotificationRepository } from '../../repositories/notification/notification-repository';
import { Notifier } from './notifier';

test('persists a notification for every matched user', async () => {
  const storedNotifications: Notification[] = [];
  const userQuerier = {
    queryUserNames: async () => ['alice', 'bob']
  } as UserAccessExpressionUserQuerier;
  const sessionProvider = {
    getDefault: async () => ({ queueUserMessage: () => undefined }) as unknown as ChatSession
  } as unknown as UserChatSessionProvider;
  const notificationRepository = {
    setup: async () => undefined,
    insertMultiple: async (_abortSignal: AbortSignal, notifications: Notification[]) => {
      storedNotifications.push(...notifications);
    },
    delete: async () => false
  } as NotificationRepository;
  const notifier = new Notifier(userQuerier, sessionProvider, notificationRepository);

  await notifier.notify(new AbortController().signal, false, '', 'Deployment completed');

  assert.equal(storedNotifications.length, 2);
  assert.deepEqual(
    storedNotifications.map(notification => ({ userName: notification.userName, message: notification.message })),
    [
      { userName: 'alice', message: 'Deployment completed' },
      { userName: 'bob', message: 'Deployment completed' }
    ]
  );
  assert.ok(storedNotifications.every(notification => notification.id.length === 48));
  assert.ok(storedNotifications.every(notification => notification.createdAt > 0));
});
